-- ============ PDR (performance development review) ============
CREATE TABLE public.pdr_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_uuid text NOT NULL,
  employee_name text NOT NULL,
  fiscal_year integer NOT NULL,
  review_id uuid REFERENCES public.performance_reviews(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'objectives',
  objectives_submitted_at timestamptz,
  objectives_approved_at timestamptz,
  objectives_revision_note text,
  aspiration_conversation_at timestamptz,
  midyear_checkin_at timestamptz,
  midyear_manager_feedback text,
  employee_self_input text,
  self_input_submitted_at timestamptz,
  manager_comments text,
  comments_finalized_at timestamptz,
  comments_revision_note text,
  year_end_score numeric,
  score_recorded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_uuid, fiscal_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_forms TO authenticated;
GRANT ALL ON public.pdr_forms TO service_role;
ALTER TABLE public.pdr_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdr_forms_select" ON public.pdr_forms FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid)
);
CREATE POLICY "pdr_forms_insert" ON public.pdr_forms FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid)
);
CREATE POLICY "pdr_forms_update" ON public.pdr_forms FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid)
);
CREATE POLICY "pdr_forms_delete" ON public.pdr_forms FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE TRIGGER pdr_forms_updated_at BEFORE UPDATE ON public.pdr_forms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pdr_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.pdr_forms(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 25,
  progress_percent numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  cascaded_from_manager boolean NOT NULL DEFAULT false,
  manager_validated boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdr_objectives TO authenticated;
GRANT ALL ON public.pdr_objectives TO service_role;
ALTER TABLE public.pdr_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdr_objectives_all" ON public.pdr_objectives FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pdr_forms f WHERE f.id = form_id AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
    OR public.is_employee_manager(f.employee_uuid) OR public.is_self_employee(f.employee_uuid)
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pdr_forms f WHERE f.id = form_id AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
    OR public.is_employee_manager(f.employee_uuid) OR public.is_self_employee(f.employee_uuid)
  )
));

CREATE TRIGGER pdr_objectives_updated_at BEFORE UPDATE ON public.pdr_objectives
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Manager budgets (merit and bonus kept separate) ============
CREATE TABLE public.manager_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_uuid text NOT NULL,
  fiscal_year integer NOT NULL,
  merit_budget_amount numeric NOT NULL DEFAULT 0,
  bonus_budget_amount numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manager_uuid, fiscal_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_budgets TO authenticated;
GRANT ALL ON public.manager_budgets TO service_role;
ALTER TABLE public.manager_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manager_budgets_select" ON public.manager_budgets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_self_employee(manager_uuid)
);
CREATE POLICY "manager_budgets_write" ON public.manager_budgets FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE TRIGGER manager_budgets_updated_at BEFORE UPDATE ON public.manager_budgets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Annual Pay Review fields on each review ============
ALTER TABLE public.performance_reviews
  ADD COLUMN rating_score integer,
  ADD COLUMN merit_percent numeric,
  ADD COLUMN merit_amount numeric,
  ADD COLUMN bonus_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN bonus_amount numeric,
  ADD COLUMN ic_score numeric,
  ADD COLUMN exec_payout_amount numeric,
  ADD COLUMN is_executive boolean NOT NULL DEFAULT false,
  ADD COLUMN fiscal_year integer,
  ADD COLUMN apr_stage text NOT NULL DEFAULT 'manager_entry',
  ADD COLUMN escalation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN escalated_to_uuid text,
  ADD COLUMN escalation_note text,
  ADD COLUMN escalation_decided_at timestamptz,
  ADD COLUMN hr_finalized_at timestamptz,
  ADD COLUMN hr_finalized_by uuid,
  ADD COLUMN coo_finance_approved_at timestamptz,
  ADD COLUMN coo_finance_approved_by uuid,
  ADD COLUMN coo_finance_note text,
  ADD COLUMN payroll_submitted_at timestamptz;

-- Convert existing wording to the 1-5 scale
UPDATE public.performance_reviews
SET rating_score = CASE overall_rating
  WHEN 'exceeds' THEN 4 WHEN 'meets' THEN 3 WHEN 'below' THEN 2 ELSE NULL END
WHERE rating_score IS NULL;

UPDATE public.performance_reviews
SET fiscal_year = EXTRACT(YEAR FROM scheduled_date)::int
WHERE fiscal_year IS NULL;

-- ============ Hard budget gate with escalation ============
CREATE OR REPLACE FUNCTION public.enforce_manager_apr_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mgr text;
  eligible int;
  b record;
  planned_merit numeric;
  planned_bonus numeric;
  fy int;
BEGIN
  IF NEW.escalation_status = 'approved' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.merit_amount,0) = COALESCE(OLD.merit_amount,0)
     AND COALESCE(NEW.bonus_amount,0) = COALESCE(OLD.bonus_amount,0) THEN
    RETURN NEW;
  END IF;

  fy := COALESCE(NEW.fiscal_year, EXTRACT(YEAR FROM NEW.scheduled_date)::int);
  SELECT manager_uuid INTO mgr FROM public.employees WHERE uuid = NEW.employee_uuid;
  IF mgr IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO eligible FROM public.employees
   WHERE manager_uuid = mgr AND terminated = false;
  IF eligible < 5 THEN RETURN NEW; END IF;

  SELECT * INTO b FROM public.manager_budgets
   WHERE manager_uuid = mgr AND fiscal_year = fy;
  IF b IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(sum(COALESCE(r.merit_amount,0)),0), COALESCE(sum(COALESCE(r.bonus_amount,0)),0)
    INTO planned_merit, planned_bonus
  FROM public.performance_reviews r
  JOIN public.employees e ON e.uuid = r.employee_uuid
  WHERE e.manager_uuid = mgr
    AND COALESCE(r.fiscal_year, EXTRACT(YEAR FROM r.scheduled_date)::int) = fy
    AND r.id <> NEW.id;

  planned_merit := planned_merit + COALESCE(NEW.merit_amount,0);
  planned_bonus := planned_bonus + COALESCE(NEW.bonus_amount,0);

  IF planned_merit > b.merit_budget_amount THEN
    RAISE EXCEPTION 'Over merit budget: team plan % exceeds budget % for FY%. Escalate to the next-level manager for an exception.',
      planned_merit, b.merit_budget_amount, fy;
  END IF;
  IF planned_bonus > b.bonus_budget_amount THEN
    RAISE EXCEPTION 'Over bonus budget: team plan % exceeds budget % for FY%. Merit and bonus budgets cannot be transferred between each other.',
      planned_bonus, b.bonus_budget_amount, fy;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_manager_apr_budget() FROM anon, authenticated;

CREATE TRIGGER enforce_manager_apr_budget_trg
BEFORE UPDATE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_manager_apr_budget();