-- =========================================================
-- 1. Employee self-assessment
-- =========================================================
CREATE TABLE public.review_self_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL UNIQUE REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  employee_uuid text NOT NULL,
  wins text,
  challenges text,
  growth text,
  support_needed text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_self_assessments TO authenticated;
GRANT ALL ON public.review_self_assessments TO service_role;
ALTER TABLE public.review_self_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_assess_read_authorized" ON public.review_self_assessments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_self_employee(employee_uuid)
    OR public.is_review_manager(review_id)
  );

CREATE POLICY "self_assess_insert_self_or_admin" ON public.review_self_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_self_employee(employee_uuid)
  );

CREATE POLICY "self_assess_update_self_or_admin" ON public.review_self_assessments
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_self_employee(employee_uuid)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_self_employee(employee_uuid)
  );

CREATE POLICY "self_assess_delete_admin_hr" ON public.review_self_assessments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE TRIGGER review_self_assessments_set_updated_at
  BEFORE UPDATE ON public.review_self_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 2. Goal check-ins
-- =========================================================
CREATE TABLE public.goal_check_ins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  review_id uuid REFERENCES public.performance_reviews(id) ON DELETE SET NULL,
  employee_uuid text NOT NULL,
  note text,
  progress_percent numeric,
  source text NOT NULL DEFAULT 'employee',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_check_ins TO authenticated;
GRANT ALL ON public.goal_check_ins TO service_role;
ALTER TABLE public.goal_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_read_authorized" ON public.goal_check_ins
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_self_employee(employee_uuid)
    OR public.is_employee_manager(employee_uuid)
  );

CREATE POLICY "checkins_insert_authorized" ON public.goal_check_ins
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_self_employee(employee_uuid)
    OR public.is_employee_manager(employee_uuid)
  );

CREATE POLICY "checkins_delete_admin_hr" ON public.goal_check_ins
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- =========================================================
-- 3. Private access tokens for self-assessment / contributor forms
-- =========================================================
CREATE TABLE public.review_access_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('self', 'contributor')),
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  contributor_id uuid REFERENCES public.review_contributors(id) ON DELETE CASCADE,
  employee_uuid text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  last_used_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_access_tokens_review_idx ON public.review_access_tokens(review_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_access_tokens TO authenticated;
GRANT ALL ON public.review_access_tokens TO service_role;
ALTER TABLE public.review_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tokens_read_staff" ON public.review_access_tokens
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(review_id)
  );

CREATE POLICY "tokens_write_staff" ON public.review_access_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(review_id)
  );

CREATE POLICY "tokens_update_staff" ON public.review_access_tokens
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(review_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(review_id)
  );

CREATE POLICY "tokens_delete_admin_hr" ON public.review_access_tokens
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- =========================================================
-- 4. Review lifecycle columns
-- =========================================================
ALTER TABLE public.performance_reviews
  ADD COLUMN released_at timestamptz,
  ADD COLUMN released_by uuid,
  ADD COLUMN employee_ack_at timestamptz,
  ADD COLUMN employee_ack_comment text,
  ADD COLUMN comp_approval_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN comp_approval_note text,
  ADD COLUMN comp_approved_by uuid,
  ADD COLUMN comp_approved_at timestamptz;

ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_comp_approval_status_check
  CHECK (comp_approval_status IN ('not_required', 'pending', 'approved', 'rejected'));

CREATE OR REPLACE FUNCTION public.guard_comp_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.comp_approval_status = 'approved'
     AND OLD.comp_approval_status IS DISTINCT FROM 'approved'
     AND auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  THEN
    RAISE EXCEPTION 'Only HR or admin can approve a compensation change.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_comp_approval_trg
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_comp_approval();

-- =========================================================
-- 5. Token functions (usable without an account)
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_review_token(
  _review_id uuid,
  _kind text,
  _contributor_id uuid DEFAULT NULL,
  _days integer DEFAULT 60
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp text;
  new_token text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
          OR public.is_review_manager(_review_id)
          OR NOT EXISTS (SELECT 1 FROM public.user_roles)) THEN
    RAISE EXCEPTION 'Not allowed to create access links for this review.';
  END IF;

  SELECT employee_uuid INTO emp FROM public.performance_reviews WHERE id = _review_id;
  IF emp IS NULL THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  IF _kind = 'contributor' AND _contributor_id IS NULL THEN
    RAISE EXCEPTION 'A contributor is required for a contributor link.';
  END IF;

  -- Reuse an existing live link so a person keeps one stable URL
  SELECT token INTO new_token
    FROM public.review_access_tokens
   WHERE review_id = _review_id
     AND kind = _kind
     AND contributor_id IS NOT DISTINCT FROM _contributor_id
     AND revoked = false
     AND expires_at > now()
   LIMIT 1;

  IF new_token IS NOT NULL THEN
    RETURN new_token;
  END IF;

  new_token := encode(gen_random_bytes(18), 'hex');
  INSERT INTO public.review_access_tokens
    (token, kind, review_id, contributor_id, employee_uuid, expires_at, created_by)
  VALUES
    (new_token, _kind, _review_id, _contributor_id, emp, now() + make_interval(days => _days), auth.uid());

  RETURN new_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_review_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  r RECORD;
  c RECORD;
  sa RECORD;
  goals_json jsonb;
BEGIN
  SELECT * INTO t FROM public.review_access_tokens WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF t.revoked THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'revoked');
  END IF;
  IF t.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  SELECT id, employee_uuid, employee_name, review_cycle, scheduled_date, review_type, title, department
    INTO r FROM public.performance_reviews WHERE id = t.review_id;

  UPDATE public.review_access_tokens SET last_used_at = now() WHERE id = t.id;

  IF t.kind = 'contributor' THEN
    SELECT id, contributor_name, status, submitted_at, allow_resubmission, submission_count,
           rating_overall, rating_collaboration, rating_impact, strengths, improvements, anonymous
      INTO c FROM public.review_contributors WHERE id = t.contributor_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
    END IF;
    RETURN jsonb_build_object(
      'valid', true,
      'kind', 'contributor',
      'review', to_jsonb(r),
      'contributor', to_jsonb(c),
      'locked', (c.status = 'submitted' AND c.allow_resubmission = false)
    );
  END IF;

  SELECT * INTO sa FROM public.review_self_assessments WHERE review_id = t.review_id;

  SELECT COALESCE(jsonb_agg(g ORDER BY g->>'title'), '[]'::jsonb) INTO goals_json
  FROM (
    SELECT jsonb_build_object(
      'id', g.id,
      'title', g.title,
      'category', g.category,
      'status', g.status,
      'target_date', g.target_date,
      'key_results', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', kr.id,
          'title', kr.title,
          'unit', kr.unit,
          'metric_type', kr.metric_type,
          'starting_value', kr.starting_value,
          'target_value', kr.target_value,
          'current_value', kr.current_value
        ) ORDER BY kr.sort_order)
        FROM public.goal_key_results kr WHERE kr.goal_id = g.id
      ), '[]'::jsonb)
    ) AS g
    FROM public.goals g
    WHERE g.employee_uuid = t.employee_uuid
      AND g.status <> 'cancelled'
  ) sub;

  RETURN jsonb_build_object(
    'valid', true,
    'kind', 'self',
    'review', to_jsonb(r),
    'self_assessment', CASE WHEN sa.id IS NULL THEN NULL ELSE to_jsonb(sa) END,
    'goals', goals_json,
    'assessment_url', '/assessment?review=' || r.id || '&employee=' || r.employee_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_self_assessment(
  _token text,
  _wins text,
  _challenges text,
  _growth text,
  _support text,
  _kr_updates jsonb DEFAULT '[]'::jsonb,
  _checkin_notes jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  item jsonb;
BEGIN
  SELECT * INTO t FROM public.review_access_tokens
   WHERE token = _token AND kind = 'self' AND revoked = false AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This link is no longer valid.';
  END IF;

  INSERT INTO public.review_self_assessments
    (review_id, employee_uuid, wins, challenges, growth, support_needed, submitted_at)
  VALUES (t.review_id, t.employee_uuid, _wins, _challenges, _growth, _support, now())
  ON CONFLICT (review_id) DO UPDATE
    SET wins = EXCLUDED.wins,
        challenges = EXCLUDED.challenges,
        growth = EXCLUDED.growth,
        support_needed = EXCLUDED.support_needed,
        submitted_at = now();

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_kr_updates, '[]'::jsonb)) LOOP
    UPDATE public.goal_key_results kr
       SET current_value = (item->>'current_value')::numeric
     WHERE kr.id = (item->>'id')::uuid
       AND EXISTS (
         SELECT 1 FROM public.goals g
          WHERE g.id = kr.goal_id AND g.employee_uuid = t.employee_uuid
       );
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(_checkin_notes, '[]'::jsonb)) LOOP
    IF COALESCE(item->>'note', '') <> '' THEN
      INSERT INTO public.goal_check_ins (goal_id, review_id, employee_uuid, note, source)
      SELECT (item->>'goal_id')::uuid, t.review_id, t.employee_uuid, item->>'note', 'employee'
       WHERE EXISTS (
         SELECT 1 FROM public.goals g
          WHERE g.id = (item->>'goal_id')::uuid AND g.employee_uuid = t.employee_uuid
       );
    END IF;
  END LOOP;

  UPDATE public.performance_reviews
     SET self_assessment_response = concat_ws(
           E'\n\n',
           NULLIF('Wins: ' || COALESCE(_wins, ''), 'Wins: '),
           NULLIF('Challenges: ' || COALESCE(_challenges, ''), 'Challenges: '),
           NULLIF('Growth: ' || COALESCE(_growth, ''), 'Growth: '),
           NULLIF('Support needed: ' || COALESCE(_support, ''), 'Support needed: ')
         ),
         status = CASE WHEN status = 'scheduled' THEN 'in_progress' ELSE status END
   WHERE id = t.review_id;

  UPDATE public.review_access_tokens SET last_used_at = now() WHERE id = t.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_contributor_feedback(
  _token text,
  _overall numeric,
  _collaboration numeric,
  _impact numeric,
  _strengths text,
  _improvements text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  c RECORD;
  next_version integer;
  version_id uuid;
BEGIN
  SELECT * INTO t FROM public.review_access_tokens
   WHERE token = _token AND kind = 'contributor' AND revoked = false AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This link is no longer valid.';
  END IF;

  SELECT * INTO c FROM public.review_contributors WHERE id = t.contributor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This feedback request no longer exists.';
  END IF;

  IF c.status = 'submitted' AND c.allow_resubmission = false THEN
    RAISE EXCEPTION 'Your feedback is already submitted. Ask HR to reopen it if you need changes.';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM public.review_contributor_versions WHERE contributor_id = c.id;

  INSERT INTO public.review_contributor_versions
    (contributor_id, version, submitted_at, rating_overall, rating_collaboration, rating_impact, strengths, improvements)
  VALUES
    (c.id, next_version, now(), _overall, _collaboration, _impact, _strengths, _improvements)
  RETURNING id INTO version_id;

  UPDATE public.review_contributors
     SET status = 'submitted',
         submitted_at = now(),
         rating_overall = _overall,
         rating_collaboration = _collaboration,
         rating_impact = _impact,
         strengths = _strengths,
         improvements = _improvements,
         current_version_id = version_id,
         submission_count = next_version
   WHERE id = c.id;

  UPDATE public.review_access_tokens SET last_used_at = now() WHERE id = t.id;

  RETURN jsonb_build_object('ok', true, 'version', next_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_review(_review_id uuid, _comment text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp text;
BEGIN
  SELECT employee_uuid INTO emp FROM public.performance_reviews WHERE id = _review_id;
  IF emp IS NULL THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;
  IF NOT public.is_self_employee(emp) THEN
    RAISE EXCEPTION 'Only the employee can acknowledge their own review.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.performance_reviews WHERE id = _review_id AND released_at IS NOT NULL) THEN
    RAISE EXCEPTION 'This review has not been shared with you yet.';
  END IF;

  UPDATE public.performance_reviews
     SET employee_ack_at = now(), employee_ack_comment = _comment
   WHERE id = _review_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =========================================================
-- 6. Mid-cycle re-sync: add reviews for people who joined a cycle's scope late
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_cycle_reviews(_cycle_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cy RECORD;
  added integer := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
          OR NOT EXISTS (SELECT 1 FROM public.user_roles)) THEN
    RAISE EXCEPTION 'Only HR or admin can sync a cycle.';
  END IF;

  SELECT * INTO cy FROM public.review_cycles WHERE id = _cycle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found.';
  END IF;

  WITH inserted AS (
    INSERT INTO public.performance_reviews (
      employee_uuid, employee_name, employee_email, department, title, hire_date,
      current_annual_comp, scheduled_date, review_cycle, status, cycle_id, review_type
    )
    SELECT e.uuid,
           e.first_name || ' ' || e.last_name,
           e.email, e.department, e.title, e.hire_date, e.current_annual_comp,
           cy.ends_at, cy.name, 'scheduled', cy.id,
           COALESCE(cy.review_types[1], 'annual')
      FROM public.employees e
     WHERE e.terminated = false
       AND (
         cy.scope_type = 'company'
         OR (cy.scope_type = 'department' AND e.department = cy.scope_value)
         OR (cy.scope_type = 'manager' AND e.manager_uuid = cy.scope_value)
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.performance_reviews pr
          WHERE pr.cycle_id = cy.id AND pr.employee_uuid = e.uuid
       )
    RETURNING 1
  )
  SELECT count(*) INTO added FROM inserted;

  RETURN added;
END;
$$;

REVOKE ALL ON FUNCTION public.create_review_token(uuid, text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_review_token(uuid, text, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_review_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_self_assessment(text, text, text, text, text, jsonb, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_contributor_feedback(text, numeric, numeric, numeric, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_review(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_cycle_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_cycle_reviews(uuid) TO authenticated, service_role;

-- =========================================================
-- 7. Close the open-to-the-internet policies on employees / goals
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can update employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can delete employees" ON public.employees;

REVOKE ALL ON public.employees FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

CREATE POLICY "employees_read_staff" ON public.employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "employees_insert_admin_hr" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR NOT EXISTS (SELECT 1 FROM public.user_roles)
  );

CREATE POLICY "employees_update_admin_hr" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR NOT EXISTS (SELECT 1 FROM public.user_roles)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR NOT EXISTS (SELECT 1 FROM public.user_roles)
  );

CREATE POLICY "employees_delete_admin_hr" ON public.employees
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

DROP POLICY IF EXISTS "Anyone can view goals" ON public.goals;
DROP POLICY IF EXISTS "Anyone can insert goals" ON public.goals;
DROP POLICY IF EXISTS "Anyone can update goals" ON public.goals;
DROP POLICY IF EXISTS "Anyone can delete goals" ON public.goals;

REVOKE ALL ON public.goals FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;

CREATE POLICY "goals_read_authorized" ON public.goals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "goals_insert_staff" ON public.goals
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_employee_manager(employee_uuid)
    OR public.is_self_employee(employee_uuid)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles)
  );

CREATE POLICY "goals_update_staff" ON public.goals
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_employee_manager(employee_uuid)
    OR public.is_self_employee(employee_uuid)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
    OR public.is_employee_manager(employee_uuid)
    OR public.is_self_employee(employee_uuid)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles)
  );

CREATE POLICY "goals_delete_admin_hr" ON public.goals
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

DROP POLICY IF EXISTS "Anyone can view key results" ON public.goal_key_results;
DROP POLICY IF EXISTS "Anyone can insert key results" ON public.goal_key_results;
DROP POLICY IF EXISTS "Anyone can update key results" ON public.goal_key_results;
DROP POLICY IF EXISTS "Anyone can delete key results" ON public.goal_key_results;

REVOKE ALL ON public.goal_key_results FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_key_results TO authenticated;
GRANT ALL ON public.goal_key_results TO service_role;

CREATE POLICY "krs_read_authorized" ON public.goal_key_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "krs_insert_staff" ON public.goal_key_results
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
       WHERE g.id = goal_id
         AND (
           public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
           OR public.is_employee_manager(g.employee_uuid)
           OR NOT EXISTS (SELECT 1 FROM public.user_roles)
         )
    )
  );

CREATE POLICY "krs_update_staff_or_self" ON public.goal_key_results
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
       WHERE g.id = goal_id
         AND (
           public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
           OR public.is_employee_manager(g.employee_uuid)
           OR public.is_self_employee(g.employee_uuid)
           OR NOT EXISTS (SELECT 1 FROM public.user_roles)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
       WHERE g.id = goal_id
         AND (
           public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
           OR public.is_employee_manager(g.employee_uuid)
           OR public.is_self_employee(g.employee_uuid)
           OR NOT EXISTS (SELECT 1 FROM public.user_roles)
         )
    )
  );

CREATE POLICY "krs_delete_admin_hr" ON public.goal_key_results
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));