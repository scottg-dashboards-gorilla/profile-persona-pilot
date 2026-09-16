-- 1. role_configs: no more anonymous table-wide read; expose active roles via a controlled function
DROP POLICY IF EXISTS "Anyone can read role configs" ON public.role_configs;

CREATE POLICY "Signed-in users can read role configs"
ON public.role_configs
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.role_configs FROM anon;

CREATE OR REPLACE FUNCTION public.public_active_role_configs()
RETURNS TABLE (
  id text,
  label text,
  description text,
  dimension_ids jsonb,
  includes_technical boolean,
  sort_order integer,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.id, rc.label, rc.description, rc.dimension_ids, rc.includes_technical, rc.sort_order, rc.is_active
  FROM public.role_configs rc
  WHERE rc.is_active
  ORDER BY rc.sort_order
$$;

GRANT EXECUTE ON FUNCTION public.public_active_role_configs() TO anon, authenticated;

-- 2. employee_profiles: replace the unchecked public insert with a validated function
DROP POLICY IF EXISTS "Public can submit assessment results" ON public.employee_profiles;

CREATE POLICY "Signed-in users can submit assessment results"
ON public.employee_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

REVOKE INSERT ON public.employee_profiles FROM anon;

CREATE OR REPLACE FUNCTION public.submit_open_assessment(
  _employee_name text,
  _scores jsonb,
  _elapsed_seconds integer,
  _disc_profile jsonb DEFAULT NULL,
  _truthfulness jsonb DEFAULT NULL,
  _role text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _employee_name IS NULL OR length(btrim(_employee_name)) < 2 THEN
    RAISE EXCEPTION 'A name is required';
  END IF;
  IF _scores IS NULL OR jsonb_typeof(_scores) <> 'array' OR jsonb_array_length(_scores) = 0 THEN
    RAISE EXCEPTION 'Assessment answers are required';
  END IF;
  IF _elapsed_seconds IS NULL OR _elapsed_seconds < 0 OR _elapsed_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid elapsed time';
  END IF;

  INSERT INTO public.employee_profiles (employee_name, role, scores, elapsed_seconds, disc_profile, truthfulness)
  VALUES (btrim(_employee_name), _role, _scores, _elapsed_seconds, _disc_profile, _truthfulness)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_open_assessment(text, jsonb, integer, jsonb, jsonb, text) TO anon, authenticated;