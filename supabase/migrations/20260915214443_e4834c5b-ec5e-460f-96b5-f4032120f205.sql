-- ============ Standalone candidate assessment ============
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  role_id text NOT NULL DEFAULT 'other',
  position_applied text,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status text NOT NULL DEFAULT 'invited',
  notes text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  elapsed_seconds integer,
  scores jsonb,
  disc_profile jsonb,
  truthfulness jsonb,
  tier text,
  raw_answers jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidates_read_hr" ON public.candidates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "candidates_insert_hr" ON public.candidates FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "candidates_update_hr" ON public.candidates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "candidates_delete_hr" ON public.candidates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE TRIGGER candidates_set_updated_at BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Candidate link resolution (no account needed)
CREATE OR REPLACE FUNCTION public.resolve_candidate_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c record;
BEGIN
  SELECT id, full_name, role_id, position_applied, status
  INTO c FROM public.candidates WHERE token = _token;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'candidate_id', c.id,
    'full_name', c.full_name,
    'role_id', c.role_id,
    'position_applied', c.position_applied,
    'status', c.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_candidate_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_candidate_assessment(
  _token text,
  _scores jsonb,
  _disc_profile jsonb,
  _truthfulness jsonb,
  _tier text,
  _elapsed_seconds integer,
  _raw_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c record;
BEGIN
  SELECT id, status INTO c FROM public.candidates WHERE token = _token;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF c.status = 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;
  UPDATE public.candidates SET
    status = 'completed',
    completed_at = now(),
    started_at = COALESCE(started_at, now()),
    scores = _scores,
    disc_profile = _disc_profile,
    truthfulness = _truthfulness,
    tier = _tier,
    elapsed_seconds = _elapsed_seconds,
    raw_answers = _raw_answers
  WHERE id = c.id;
  RETURN jsonb_build_object('ok', true, 'candidate_id', c.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_candidate_assessment(text, jsonb, jsonb, jsonb, text, integer, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_candidate_started(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.candidates
  SET status = CASE WHEN status = 'invited' THEN 'in_progress' ELSE status END,
      started_at = COALESCE(started_at, now())
  WHERE token = _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_candidate_started(text) TO anon, authenticated;

-- ============ Tighten over-permissive access rules ============
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.employee_profiles;

CREATE POLICY "employee_profiles_read_staff" ON public.employee_profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "employee_profiles_delete_hr" ON public.employee_profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

DROP POLICY IF EXISTS "Signed-in users can view company performance" ON public.company_performance_years;

CREATE POLICY "company_years_read_authorized" ON public.company_performance_years FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.has_role(auth.uid(), 'manager')
);

DROP POLICY IF EXISTS "goals_read_authorized" ON public.goals;

CREATE POLICY "goals_read_authorized" ON public.goals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_self_employee(employee_uuid)
  OR public.is_employee_manager(employee_uuid)
);