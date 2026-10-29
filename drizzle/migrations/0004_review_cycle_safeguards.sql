CREATE OR REPLACE FUNCTION public.can_read_review_draft(_review_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_hr_or_admin() OR public.is_review_manager(_review_id))
$$;
REVOKE ALL ON FUNCTION public.can_read_review_draft(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_review_draft(uuid) TO authenticated;

DO $$
DECLARE t text; cols text; safe text; c record; visible text;
BEGIN
 FOREACH t IN ARRAY ARRAY['performance_reviews','review_value_ratings','review_question_responses'] LOOP
  cols := ''; safe := '';
  FOR c IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=t ORDER BY ordinal_position LOOP
   IF t='performance_reviews' THEN
    visible := 'public.can_read_review_draft(r.id) OR r.released_at IS NOT NULL';
    IF c.column_name = ANY(ARRAY['id','employee_uuid','employee_name','employee_email','department','title','hire_date','scheduled_date','completed_date','review_cycle','status','cycle_id','review_type','reviewer_uuid','created_at','updated_at','assessment_attempt_id','released_at','employee_ack_at','employee_ack_comment','kickoff_at','fiscal_year','apr_stage','self_assessment_sent_at','manager_review_sent_at']) THEN
     cols := cols || format('r.%I,',c.column_name); safe := safe || format('%I,',c.column_name);
    ELSE
     cols := cols || format('CASE WHEN %s THEN r.%I ELSE NULL END AS %I,',visible,c.column_name,c.column_name);
    END IF;
   ELSE
    visible := 'public.can_read_review_draft(r.review_id) OR EXISTS (SELECT 1 FROM public.performance_reviews p WHERE p.id=r.review_id AND p.released_at IS NOT NULL)';
    IF c.column_name LIKE 'manager_%' THEN
     cols := cols || format('CASE WHEN %s THEN r.%I ELSE NULL END AS %I,',visible,c.column_name,c.column_name);
    ELSE
     cols := cols || format('r.%I,',c.column_name); safe := safe || format('%I,',c.column_name);
    END IF;
   END IF;
  END LOOP;
  EXECUTE format('CREATE OR REPLACE VIEW public.%I WITH (security_barrier=true) AS SELECT %s FROM public.%I r WHERE auth.uid() IS NOT NULL AND (public.is_hr_or_admin() OR public.is_review_manager(%s) OR public.is_self_employee(r.employee_uuid))',t||'_visible',rtrim(cols,','),t,CASE WHEN t='performance_reviews' THEN 'r.id' ELSE 'r.review_id' END);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon; GRANT SELECT ON public.%I TO authenticated; GRANT ALL ON public.%I TO service_role',t||'_visible',t||'_visible',t||'_visible');
  EXECUTE format('REVOKE SELECT ON public.%I FROM authenticated, anon',t);
  EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated',rtrim(safe,','),t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.save_review_grading(_review_id uuid, _kind text, _key text, _side text, _patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE emp text; own boolean; mgr boolean; score numeric;
BEGIN
 SELECT employee_uuid INTO emp FROM public.performance_reviews WHERE id=_review_id;
 IF emp IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 own := public.is_self_employee(emp); mgr := public.can_read_review_draft(_review_id);
 IF (_side='self' AND NOT own) OR (_side='manager' AND NOT mgr) OR _side NOT IN ('self','manager') THEN RAISE EXCEPTION 'Not allowed to grade this side'; END IF;
 score := NULLIF(_patch->>(_side||'_score'),'')::numeric;
 IF score IS NOT NULL AND (score<1 OR score>5) THEN RAISE EXCEPTION 'Scores must be between 1 and 5'; END IF;
 IF _kind='value' THEN
  IF _key NOT IN ('D','P','I','N','C') THEN RAISE EXCEPTION 'Invalid value'; END IF;
  IF _side='self' THEN
   INSERT INTO public.review_value_ratings(review_id,employee_uuid,value_code,self_score,self_comment) VALUES(_review_id,emp,_key,score,_patch->>'self_comment')
   ON CONFLICT(review_id,value_code) DO UPDATE SET self_score=CASE WHEN _patch ? 'self_score' THEN EXCLUDED.self_score ELSE review_value_ratings.self_score END,self_comment=CASE WHEN _patch ? 'self_comment' THEN EXCLUDED.self_comment ELSE review_value_ratings.self_comment END;
  ELSE
   INSERT INTO public.review_value_ratings(review_id,employee_uuid,value_code,manager_score,manager_comment) VALUES(_review_id,emp,_key,score,_patch->>'manager_comment')
   ON CONFLICT(review_id,value_code) DO UPDATE SET manager_score=CASE WHEN _patch ? 'manager_score' THEN EXCLUDED.manager_score ELSE review_value_ratings.manager_score END,manager_comment=CASE WHEN _patch ? 'manager_comment' THEN EXCLUDED.manager_comment ELSE review_value_ratings.manager_comment END;
  END IF;
 ELSIF _kind='question' THEN
  IF NOT EXISTS(SELECT 1 FROM public.department_questions WHERE id=_key::uuid AND is_active) THEN RAISE EXCEPTION 'Question unavailable'; END IF;
  IF _side='self' THEN
   INSERT INTO public.review_question_responses(review_id,employee_uuid,question_id,self_score,self_text) VALUES(_review_id,emp,_key::uuid,score,_patch->>'self_text')
   ON CONFLICT(review_id,question_id) DO UPDATE SET self_score=CASE WHEN _patch ? 'self_score' THEN EXCLUDED.self_score ELSE review_question_responses.self_score END,self_text=CASE WHEN _patch ? 'self_text' THEN EXCLUDED.self_text ELSE review_question_responses.self_text END;
  ELSE
   INSERT INTO public.review_question_responses(review_id,employee_uuid,question_id,manager_score,manager_text) VALUES(_review_id,emp,_key::uuid,score,_patch->>'manager_text')
   ON CONFLICT(review_id,question_id) DO UPDATE SET manager_score=CASE WHEN _patch ? 'manager_score' THEN EXCLUDED.manager_score ELSE review_question_responses.manager_score END,manager_text=CASE WHEN _patch ? 'manager_text' THEN EXCLUDED.manager_text ELSE review_question_responses.manager_text END;
  END IF;
 ELSE RAISE EXCEPTION 'Invalid grading kind'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.save_review_grading(uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_review_grading(uuid,text,text,text,jsonb) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.review_value_ratings, public.review_question_responses FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.refresh_review_value_blend()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v numeric; n integer; rid uuid;
BEGIN
 rid := COALESCE(NEW.review_id,OLD.review_id);
 SELECT count(DISTINCT value_code),round(avg(manager_score),1) INTO n,v FROM public.review_value_ratings WHERE review_id=rid AND value_code IN ('D','P','I','N','C') AND manager_score BETWEEN 1 AND 5;
 IF n<>5 THEN v:=NULL; END IF;
 UPDATE public.performance_reviews SET values_avg_score=v,
 effective_rating_score=CASE WHEN rating_score IS NULL THEN NULL WHEN v IS NULL THEN rating_score ELSE greatest(1,least(5,round(rating_score*0.7+v*0.3))) END,
 overall_rating=CASE WHEN rating_score IS NULL THEN overall_rating WHEN COALESCE(greatest(1,least(5,round(rating_score*0.7+v*0.3))),rating_score)>=4 THEN 'exceeds' WHEN COALESCE(greatest(1,least(5,round(rating_score*0.7+v*0.3))),rating_score)=3 THEN 'meets' ELSE 'needs_improvement' END
 WHERE id=rid;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER refresh_review_value_blend_trg AFTER INSERT OR UPDATE OF manager_score OR DELETE ON public.review_value_ratings FOR EACH ROW EXECUTE FUNCTION public.refresh_review_value_blend();

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
 IF NEW.manager_approved_at IS NOT NULL AND OLD.manager_approved_at IS DISTINCT FROM NEW.manager_approved_at AND NEW.status<>'completed' THEN RAISE EXCEPTION 'Complete the review before manager approval'; END IF;
 IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL AND NEW.manager_approved_at IS NULL THEN RAISE EXCEPTION 'Manager approval is required before sharing'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_review_completeness_trg BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_review_completeness();