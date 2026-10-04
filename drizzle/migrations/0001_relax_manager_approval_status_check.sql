CREATE OR REPLACE FUNCTION public.guard_manager_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.manager_approved_at IS DISTINCT FROM OLD.manager_approved_at AND auth.uid() IS NOT NULL THEN
    IF NOT (public.is_review_manager(NEW.id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')) THEN
      RAISE EXCEPTION 'Only the employee''s manager can approve this review.';
    END IF;
    IF NEW.manager_approved_at IS NOT NULL THEN
      NEW.manager_approved_by := auth.uid();
    END IF;
  END IF;
  IF NEW.comp_approval_status IN ('rejected','changes_requested')
     AND OLD.comp_approval_status IS DISTINCT FROM NEW.comp_approval_status THEN
    NEW.manager_approved_at := NULL;
    NEW.manager_approved_by := NULL;
  END IF;
  IF NEW.comp_approval_status = 'approved' AND OLD.comp_approval_status IS DISTINCT FROM 'approved'
     AND NEW.manager_approved_at IS NULL THEN
    RAISE EXCEPTION 'Manager approval is required before HR can approve the pay recommendation.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
UPDATE public.performance_reviews SET manager_approved_at = COALESCE(comp_submitted_at, now())
  WHERE comp_approval_status = 'submitted' AND manager_approved_at IS NULL;