CREATE TABLE public.performance_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid text NOT NULL REFERENCES public.employees(uuid),
  note_type text NOT NULL CHECK (note_type IN ('observation','verbal_warning','written_warning','final_warning','pip_referral')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  details text NOT NULL,
  expected_change text,
  follow_up_date date,
  witnesses text,
  author_id uuid DEFAULT auth.uid(),
  author_name text,
  employee_ack_at timestamptz,
  employee_ack_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.performance_note_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.performance_notes(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_by_name text,
  previous jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.performance_notes TO authenticated;
GRANT ALL ON public.performance_notes TO service_role;
GRANT SELECT ON public.performance_note_history TO authenticated;
GRANT ALL ON public.performance_note_history TO service_role;
ALTER TABLE public.performance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_note_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders read notes" ON public.performance_notes FOR SELECT TO authenticated
USING (public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid)
  OR (public.is_self_employee(employee_uuid) AND note_type IN ('written_warning','final_warning','pip_referral')));
CREATE POLICY "Leaders add notes" ON public.performance_notes FOR INSERT TO authenticated
WITH CHECK ((public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid)) AND author_id = auth.uid());
CREATE POLICY "Leaders edit notes" ON public.performance_notes FOR UPDATE TO authenticated
USING (public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid))
WITH CHECK (public.is_hr_or_admin() OR public.is_employee_manager(employee_uuid));
CREATE POLICY "Leaders read note history" ON public.performance_note_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.performance_notes n WHERE n.id = note_id
  AND (public.is_hr_or_admin() OR public.is_employee_manager(n.employee_uuid))));

CREATE OR REPLACE FUNCTION public.guard_performance_note() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT coalesce(first_name||' '||last_name, NULL) INTO _name FROM employees WHERE user_id = auth.uid() LIMIT 1;
  IF TG_OP = 'INSERT' THEN
    NEW.author_name := coalesce(_name, NEW.author_name);
    NEW.employee_ack_at := NULL; NEW.employee_ack_comment := NULL;
    RETURN NEW;
  END IF;
  NEW.created_at := OLD.created_at; NEW.author_id := OLD.author_id; NEW.author_name := OLD.author_name;
  NEW.employee_uuid := OLD.employee_uuid;
  IF current_setting('app.note_ack', true) IS DISTINCT FROM 'on' THEN
    NEW.employee_ack_at := OLD.employee_ack_at; NEW.employee_ack_comment := OLD.employee_ack_comment;
  END IF;
  NEW.updated_at := now();
  INSERT INTO performance_note_history(note_id, changed_by, changed_by_name, previous)
  VALUES (OLD.id, auth.uid(), _name, to_jsonb(OLD));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_performance_note BEFORE INSERT OR UPDATE ON public.performance_notes
FOR EACH ROW EXECUTE FUNCTION public.guard_performance_note();

CREATE OR REPLACE FUNCTION public.acknowledge_performance_note(_note_id uuid, _comment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _emp text; _type text;
BEGIN
  SELECT employee_uuid, note_type INTO _emp, _type FROM performance_notes WHERE id = _note_id;
  IF _emp IS NULL OR NOT public.is_self_employee(_emp) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _type NOT IN ('written_warning','final_warning','pip_referral') THEN RAISE EXCEPTION 'Only formal warnings need sign-off'; END IF;
  PERFORM set_config('app.note_ack','on',true);
  UPDATE performance_notes SET employee_ack_at = now(), employee_ack_comment = nullif(trim(_comment),'')
  WHERE id = _note_id AND employee_ack_at IS NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.acknowledge_performance_note(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.acknowledge_performance_note(uuid,text) TO authenticated;