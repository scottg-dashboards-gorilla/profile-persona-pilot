
CREATE OR REPLACE FUNCTION public.enforce_review_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  att RECORD;
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed' OR NEW.assessment_attempt_id IS DISTINCT FROM OLD.assessment_attempt_id)
  THEN
    IF NEW.assessment_attempt_id IS NULL THEN
      RAISE EXCEPTION 'Cannot complete review: an assessment attempt is required for this review period.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT review_id, cycle_id, employee_uuid
      INTO att
      FROM public.assessment_attempts
     WHERE id = NEW.assessment_attempt_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot complete review: linked assessment attempt no longer exists.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF att.employee_uuid IS DISTINCT FROM NEW.employee_uuid THEN
      RAISE EXCEPTION 'Cannot complete review: assessment attempt belongs to a different employee.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF att.review_id IS DISTINCT FROM NEW.id
       AND (att.cycle_id IS NULL OR att.cycle_id IS DISTINCT FROM NEW.cycle_id)
    THEN
      RAISE EXCEPTION 'Cannot complete review: linked assessment attempt is not from this review or cycle.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_review_assessment_trg ON public.performance_reviews;
CREATE TRIGGER enforce_review_assessment_trg
BEFORE UPDATE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_assessment();
