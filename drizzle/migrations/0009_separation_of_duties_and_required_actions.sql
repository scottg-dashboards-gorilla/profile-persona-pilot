CREATE OR REPLACE FUNCTION public.review_uncovered_flagged_areas(_review_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; cur record; prev record; k text; v jsonb; tov numeric; fromv numeric; n int := 0; pr int; cr int;
BEGIN
  SELECT id, employee_uuid, assessment_attempt_id INTO r FROM performance_reviews WHERE id=_review_id;
  IF r.assessment_attempt_id IS NULL THEN RETURN 0; END IF;
  SELECT * INTO cur FROM assessment_attempts WHERE id=r.assessment_attempt_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT * INTO prev FROM assessment_attempts WHERE employee_uuid=cur.employee_uuid AND id<>cur.id AND taken_at<cur.taken_at ORDER BY taken_at DESC LIMIT 1;
  FOR k, v IN SELECT key, value FROM jsonb_each(COALESCE(cur.technical_scores,'{}'::jsonb)) LOOP
    tov := CASE WHEN jsonb_typeof(v)='number' THEN v::text::numeric ELSE COALESCE((v->>'normalizedScore')::numeric,(v->>'score')::numeric) END;
    CONTINUE WHEN tov IS NULL;
    fromv := NULL;
    IF prev.id IS NOT NULL AND prev.technical_scores ? k THEN
      v := prev.technical_scores->k;
      fromv := CASE WHEN jsonb_typeof(v)='number' THEN v::text::numeric ELSE COALESCE((v->>'normalizedScore')::numeric,(v->>'score')::numeric) END;
    END IF;
    IF tov <= 60 OR (fromv IS NOT NULL AND tov - fromv <= -5) THEN
      IF NOT EXISTS (SELECT 1 FROM assessment_action_items a WHERE a.employee_uuid=r.employee_uuid
          AND (a.review_id=r.id OR a.attempt_id=cur.id) AND a.delta_kind='technical' AND a.delta_key=k
          AND btrim(COALESCE(a.action,''))<>'' AND a.due_date IS NOT NULL) THEN n := n+1; END IF;
    END IF;
  END LOOP;
  pr := CASE replace(COALESCE(prev.tier,''),'_','-') WHEN 'tier-1' THEN 1 WHEN 'tier-2' THEN 2 WHEN 'team-leader' THEN 3 END;
  cr := CASE replace(COALESCE(cur.tier,''),'_','-') WHEN 'tier-1' THEN 1 WHEN 'tier-2' THEN 2 WHEN 'team-leader' THEN 3 END;
  IF pr IS NOT NULL AND cr IS NOT NULL AND cr < pr AND NOT EXISTS (SELECT 1 FROM assessment_action_items a WHERE a.employee_uuid=r.employee_uuid
      AND (a.review_id=r.id OR a.attempt_id=cur.id) AND a.delta_kind='tier' AND btrim(COALESCE(a.action,''))<>'' AND a.due_date IS NOT NULL) THEN n := n+1; END IF;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.guard_review_required_actions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    n := public.review_uncovered_flagged_areas(NEW.id);
    IF n > 0 THEN RAISE EXCEPTION '% assessment area(s) flagged for improvement still need an action and a due date before the review can be completed', n USING ERRCODE='check_violation'; END IF;
  END IF;
  IF NEW.comp_approval_status='approved' AND OLD.comp_approval_status IS DISTINCT FROM 'approved'
     AND auth.uid() IS NOT NULL AND NEW.manager_approved_by = auth.uid() THEN
    RAISE EXCEPTION 'The person who approved this review as manager cannot also give the HR pay approval. Ask another HR or admin user.' USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER zz_guard_review_required_actions BEFORE UPDATE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_review_required_actions();
REVOKE EXECUTE ON FUNCTION public.review_uncovered_flagged_areas(uuid) FROM anon;