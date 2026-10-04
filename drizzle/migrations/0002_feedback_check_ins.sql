CREATE TABLE public.feedback_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid text NOT NULL REFERENCES public.employees(uuid) ON DELETE CASCADE,
  employee_name text NOT NULL,
  department text,
  fiscal_year integer NOT NULL DEFAULT extract(year from now())::int,
  requested_by uuid DEFAULT auth.uid(),
  requester_name text,
  note text,
  due_date date,
  employee_required boolean NOT NULL DEFAULT true,
  manager_submitted_at timestamptz,
  employee_submitted_at timestamptz,
  shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.feedback_check_ins(employee_uuid, fiscal_year);

CREATE TABLE public.feedback_check_in_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id uuid NOT NULL REFERENCES public.feedback_check_ins(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('manager','employee')),
  item_kind text NOT NULL CHECK (item_kind IN ('value','question')),
  item_key text NOT NULL,
  score numeric CHECK (score IS NULL OR (score >= 1 AND score <= 5)),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (check_in_id, side, item_kind, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_check_ins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_check_in_answers TO authenticated;
GRANT ALL ON public.feedback_check_ins TO service_role;
GRANT ALL ON public.feedback_check_in_answers TO service_role;

ALTER TABLE public.feedback_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_check_in_answers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_hr_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
$$;

-- Can the caller read/write one side of a check-in's answers?
CREATE OR REPLACE FUNCTION public.check_in_side_access(_check_in_id uuid, _side text, _write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feedback_check_ins c
    WHERE c.id = _check_in_id AND (
      CASE
        WHEN _write AND _side = 'manager' THEN c.manager_submitted_at IS NULL
          AND (public.is_employee_manager(c.employee_uuid) OR public.is_hr_or_admin())
        WHEN _write AND _side = 'employee' THEN c.employee_submitted_at IS NULL
          AND public.is_self_employee(c.employee_uuid)
        ELSE
          public.is_hr_or_admin()
          OR (_side = 'manager' AND public.is_employee_manager(c.employee_uuid))
          OR (_side = 'employee' AND public.is_self_employee(c.employee_uuid))
          -- Blind until both sides submit, then each sees the other.
          OR (c.shared_at IS NOT NULL AND (public.is_employee_manager(c.employee_uuid) OR public.is_self_employee(c.employee_uuid)))
      END
    )
  )
$$;
REVOKE ALL ON FUNCTION public.check_in_side_access(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_side_access(uuid,text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin() TO authenticated;

CREATE POLICY "View own, team or all check-ins" ON public.feedback_check_ins FOR SELECT TO authenticated
  USING (public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid));
CREATE POLICY "Managers and HR start check-ins" ON public.feedback_check_ins FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid));
CREATE POLICY "Participants update check-ins" ON public.feedback_check_ins FOR UPDATE TO authenticated
  USING (public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid));
CREATE POLICY "Managers and HR delete unshared check-ins" ON public.feedback_check_ins FOR DELETE TO authenticated
  USING (shared_at IS NULL AND (public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid)));

CREATE POLICY "Read permitted answers" ON public.feedback_check_in_answers FOR SELECT TO authenticated
  USING (public.check_in_side_access(check_in_id, side, false));
CREATE POLICY "Write own side" ON public.feedback_check_in_answers FOR INSERT TO authenticated
  WITH CHECK (public.check_in_side_access(check_in_id, side, true));
CREATE POLICY "Edit own side" ON public.feedback_check_in_answers FOR UPDATE TO authenticated
  USING (public.check_in_side_access(check_in_id, side, true))
  WITH CHECK (public.check_in_side_access(check_in_id, side, true));
CREATE POLICY "Delete own side" ON public.feedback_check_in_answers FOR DELETE TO authenticated
  USING (public.check_in_side_access(check_in_id, side, true));

-- Who may stamp which submission; reveal once both are in.
CREATE OR REPLACE FUNCTION public.guard_feedback_check_in()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.employee_submitted_at IS DISTINCT FROM OLD.employee_submitted_at
       AND NOT public.is_self_employee(NEW.employee_uuid) THEN
      RAISE EXCEPTION 'Only the employee can submit their side of the check-in.';
    END IF;
    IF NEW.manager_submitted_at IS DISTINCT FROM OLD.manager_submitted_at
       AND NOT (public.is_employee_manager(NEW.employee_uuid) OR public.is_hr_or_admin()) THEN
      RAISE EXCEPTION 'Only the manager can submit their side of the check-in.';
    END IF;
    IF public.is_self_employee(NEW.employee_uuid)
       AND NOT (public.is_employee_manager(NEW.employee_uuid) OR public.is_hr_or_admin())
       AND (NEW.note IS DISTINCT FROM OLD.note OR NEW.due_date IS DISTINCT FROM OLD.due_date
            OR NEW.employee_required IS DISTINCT FROM OLD.employee_required
            OR NEW.manager_submitted_at IS DISTINCT FROM OLD.manager_submitted_at
            OR NEW.shared_at IS DISTINCT FROM OLD.shared_at) THEN
      RAISE EXCEPTION 'Employees can only submit their own answers.';
    END IF;
  END IF;
  IF OLD.manager_submitted_at IS NOT NULL AND NEW.manager_submitted_at IS NULL THEN
    RAISE EXCEPTION 'A submitted manager side cannot be reopened.';
  END IF;
  IF OLD.employee_submitted_at IS NOT NULL AND NEW.employee_submitted_at IS NULL THEN
    RAISE EXCEPTION 'A submitted employee side cannot be reopened.';
  END IF;
  IF NEW.shared_at IS NULL AND NEW.manager_submitted_at IS NOT NULL
     AND (NEW.employee_submitted_at IS NOT NULL OR NOT NEW.employee_required) THEN
    NEW.shared_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_feedback_check_in BEFORE UPDATE ON public.feedback_check_ins
  FOR EACH ROW EXECUTE FUNCTION public.guard_feedback_check_in();
CREATE TRIGGER trg_check_in_answers_updated BEFORE UPDATE ON public.feedback_check_in_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();