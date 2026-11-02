CREATE OR REPLACE FUNCTION public.guard_review_completeness()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 IF (NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed') OR
 (NEW.manager_approved_at IS NOT NULL AND OLD.manager_approved_at IS DISTINCT FROM NEW.manager_approved_at) OR
 (NEW.released_at IS NOT NULL AND OLD.released_at IS NULL) THEN
  IF COALESCE(btrim(NEW.notes),'')='' THEN RAISE EXCEPTION 'Manager feedback is required before completing or approving the review'; END IF;
  SELECT count(DISTINCT value_code) INTO n FROM public.review_value_ratings WHERE review_id=NEW.id AND value_code IN ('D','P','I','N','C') AND manager_score BETWEEN 1 AND 5;
  IF n<>5 THEN RAISE EXCEPTION 'Score all five DP INC values before completing or approving the review'; END IF;
 END IF;
 IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL AND NEW.manager_approved_at IS NULL THEN RAISE EXCEPTION 'Manager approval is required before sharing'; END IF;
 RETURN NEW;
END $$;