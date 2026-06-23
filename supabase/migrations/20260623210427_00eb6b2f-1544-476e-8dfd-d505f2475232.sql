
-- 1) Create table
CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid text NOT NULL,
  review_id uuid REFERENCES public.performance_reviews(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES public.review_cycles(id) ON DELETE SET NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  disc_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  disc_primary text,
  tier text,
  technical_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  truthfulness_score numeric,
  raw_answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_attempts_employee_idx ON public.assessment_attempts(employee_uuid, taken_at DESC);
CREATE INDEX assessment_attempts_review_idx ON public.assessment_attempts(review_id);
CREATE INDEX assessment_attempts_cycle_idx ON public.assessment_attempts(cycle_id);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_attempts TO authenticated;
GRANT ALL ON public.assessment_attempts TO service_role;

-- 3) RLS
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user the linked employee?
CREATE OR REPLACE FUNCTION public.is_self_employee(_employee_uuid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE uuid::text = _employee_uuid
      AND user_id = auth.uid()
  )
$$;

-- Helper: is the current user a manager of an attempt's employee?
CREATE OR REPLACE FUNCTION public.is_attempt_manager(_attempt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT uuid FROM public.employees WHERE user_id = auth.uid() LIMIT 1
  ),
  a AS (
    SELECT employee_uuid FROM public.assessment_attempts WHERE id = _attempt_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e, me, a
    WHERE e.uuid::text = a.employee_uuid
      AND (
        e.manager_uuid = me.uuid
        OR e.manager_uuid IN (SELECT uuid FROM public.employees WHERE manager_uuid = me.uuid)
      )
  )
$$;

CREATE POLICY "attempts_select_authorized"
ON public.assessment_attempts FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_self_employee(employee_uuid)
  OR public.is_attempt_manager(id)
);

CREATE POLICY "attempts_insert_self_or_admin"
ON public.assessment_attempts FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_self_employee(employee_uuid)
);

CREATE POLICY "attempts_update_admin_hr"
ON public.assessment_attempts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "attempts_delete_admin_hr"
ON public.assessment_attempts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- 4) updated_at trigger
CREATE TRIGGER assessment_attempts_set_updated_at
BEFORE UPDATE ON public.assessment_attempts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Link reviews to the attempt used at completion
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS assessment_attempt_id uuid
  REFERENCES public.assessment_attempts(id) ON DELETE SET NULL;

-- 6) Backfill historical assessment rows (best-effort name match)
INSERT INTO public.assessment_attempts (
  employee_uuid, taken_at, submitted_at,
  disc_scores, disc_primary, tier,
  technical_scores, truthfulness_score
)
SELECT
  COALESCE(e.uuid::text, ep.employee_name),
  ep.created_at,
  ep.created_at,
  COALESCE(ep.disc_profile, '{}'::jsonb),
  CASE
    WHEN ep.disc_profile ? 'primary' THEN ep.disc_profile->>'primary'
    ELSE NULL
  END,
  CASE
    WHEN ep.scores ? 'tier' THEN ep.scores->>'tier'
    ELSE NULL
  END,
  COALESCE(ep.scores, '{}'::jsonb),
  CASE
    WHEN ep.truthfulness ? 'score' THEN (ep.truthfulness->>'score')::numeric
    ELSE NULL
  END
FROM public.employee_profiles ep
LEFT JOIN public.employees e
  ON lower(trim(e.first_name || ' ' || e.last_name)) = lower(trim(ep.employee_name));
