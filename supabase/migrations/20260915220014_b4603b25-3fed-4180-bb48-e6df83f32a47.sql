CREATE OR REPLACE FUNCTION public.enforce_comp_approved_before_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
    IF NEW.status <> 'completed' THEN
      RAISE EXCEPTION 'Cannot share the outcome: the review is not completed yet.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF COALESCE(NEW.comp_adjustment_amount, 0) <> 0 AND NEW.comp_approval_status <> 'approved' THEN
      RAISE EXCEPTION 'Cannot share the outcome: the pay change must be approved by HR first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_comp_approved_before_release_trg ON public.performance_reviews;
CREATE TRIGGER enforce_comp_approved_before_release_trg
BEFORE UPDATE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_comp_approved_before_release();