ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_approved_by uuid,
  ADD COLUMN IF NOT EXISTS manager_approval_note text;

CREATE OR REPLACE FUNCTION public.guard_manager_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Setting or clearing manager approval: only the employee's manager, HR or admin.
  IF NEW.manager_approved_at IS DISTINCT FROM OLD.manager_approved_at AND auth.uid() IS NOT NULL THEN
    IF NOT (public.is_review_manager(NEW.id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')) THEN
      RAISE EXCEPTION 'Only the employee''s manager can approve this review.';
    END IF;
    IF NEW.manager_approved_at IS NOT NULL THEN
      IF NEW.status <> 'completed' THEN
        RAISE EXCEPTION 'Complete the review before giving manager approval.';
      END IF;
      NEW.manager_approved_by := auth.uid();
    END IF;
  END IF;
  -- Sending back from HR resets the manager approval so the manager re-approves.
  IF NEW.comp_approval_status IN ('rejected','changes_requested')
     AND OLD.comp_approval_status IS DISTINCT FROM NEW.comp_approval_status THEN
    NEW.manager_approved_at := NULL;
    NEW.manager_approved_by := NULL;
  END IF;
  -- HR cannot approve pay until the manager has approved.
  IF NEW.comp_approval_status = 'approved' AND OLD.comp_approval_status IS DISTINCT FROM 'approved'
     AND NEW.manager_approved_at IS NULL THEN
    RAISE EXCEPTION 'Manager approval is required before HR can approve the pay recommendation.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_manager_approval ON public.performance_reviews;
CREATE TRIGGER trg_guard_manager_approval BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_manager_approval();

-- Already-approved pay keeps its standing.
UPDATE public.performance_reviews SET manager_approved_at = COALESCE(comp_approved_at, now())
  WHERE comp_approval_status = 'approved' AND manager_approved_at IS NULL;