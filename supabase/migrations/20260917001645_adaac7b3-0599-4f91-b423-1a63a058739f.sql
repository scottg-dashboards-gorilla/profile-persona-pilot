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
  fy int;
BEGIN
  IF NEW.escalation_status = 'approved' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.merit_amount,0) = COALESCE(OLD.merit_amount,0) THEN
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

  SELECT COALESCE(sum(COALESCE(r.merit_amount,0)),0)
    INTO planned_merit
  FROM public.performance_reviews r
  JOIN public.employees e ON e.uuid = r.employee_uuid
  WHERE e.manager_uuid = mgr
    AND COALESCE(r.fiscal_year, EXTRACT(YEAR FROM r.scheduled_date)::int) = fy
    AND r.id <> NEW.id;

  planned_merit := planned_merit + COALESCE(NEW.merit_amount,0);

  IF planned_merit > b.merit_budget_amount THEN
    RAISE EXCEPTION 'Over merit budget: team plan % exceeds budget % for FY%. Escalate to the next-level manager for an exception.',
      planned_merit, b.merit_budget_amount, fy;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_manager_apr_budget() FROM anon, authenticated;

ALTER TABLE public.performance_reviews DROP COLUMN IF EXISTS bonus_eligible;
ALTER TABLE public.performance_reviews DROP COLUMN IF EXISTS bonus_amount;
ALTER TABLE public.manager_budgets DROP COLUMN IF EXISTS bonus_budget_amount;