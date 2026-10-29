CREATE OR REPLACE FUNCTION public.save_my_assessment_attempt(_employee_uuid text, _review_id uuid, _disc_scores jsonb, _disc_primary text, _tier text, _technical_scores jsonb, _truthfulness numeric, _raw_answers jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target text; cycle uuid; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required to save an assessment'; END IF;
 SELECT uuid INTO target FROM public.employees WHERE user_id=auth.uid() AND NOT terminated LIMIT 1;
 IF target IS NULL THEN RAISE EXCEPTION 'No active staff record linked to this sign-in'; END IF;
 IF _employee_uuid IS NOT NULL AND _employee_uuid<>target THEN RAISE EXCEPTION 'You can only submit your own assessment'; END IF;
 IF _review_id IS NOT NULL THEN
  SELECT cycle_id INTO cycle FROM public.performance_reviews WHERE id=_review_id AND employee_uuid=target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review does not belong to your employee record'; END IF;
 END IF;
 INSERT INTO public.assessment_attempts(employee_uuid,review_id,cycle_id,submitted_at,disc_scores,disc_primary,tier,technical_scores,truthfulness_score,raw_answers)
 VALUES(target,_review_id,cycle,now(),COALESCE(_disc_scores,'{}'),_disc_primary,_tier,COALESCE(_technical_scores,'{}'),_truthfulness,_raw_answers) RETURNING id INTO result;
 IF _review_id IS NOT NULL THEN UPDATE public.performance_reviews SET assessment_attempt_id=result WHERE id=_review_id; END IF;
 RETURN result;
END $$;