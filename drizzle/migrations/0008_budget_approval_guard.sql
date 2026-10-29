CREATE OR REPLACE FUNCTION public.guard_manager_budget_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.merit_budget_amount IS DISTINCT FROM OLD.merit_budget_amount
     AND NEW.approval_status = 'approved' AND OLD.approval_status = 'approved' THEN
    NEW.approval_status := 'pending';
  END IF;
  IF NEW.approval_status = 'approved' AND (TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
  ELSIF NEW.approval_status <> 'approved' THEN
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER manager_budgets_approval_guard BEFORE INSERT OR UPDATE ON public.manager_budgets
FOR EACH ROW EXECUTE FUNCTION public.guard_manager_budget_approval();