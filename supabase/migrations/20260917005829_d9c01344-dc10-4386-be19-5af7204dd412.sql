-- 1) Re-key existing assessment attempts that were stored under a person's name
UPDATE public.assessment_attempts a
SET employee_uuid = e.uuid
FROM public.employees e
WHERE a.employee_uuid = btrim(e.first_name || ' ' || e.last_name)
  AND a.employee_uuid <> e.uuid;

-- 2) Backfill attempts from completed assessment profiles that never produced one
INSERT INTO public.assessment_attempts (
  employee_uuid, taken_at, submitted_at, disc_scores, disc_primary,
  technical_scores, truthfulness_score
)
SELECT e.uuid,
       p.created_at,
       p.created_at,
       COALESCE(jsonb_build_object(
         'D', (p.disc_profile->>'D')::numeric,
         'I', (p.disc_profile->>'I')::numeric,
         'S', (p.disc_profile->>'S')::numeric,
         'C', (p.disc_profile->>'C')::numeric
       ), '{}'::jsonb),
       p.disc_profile->>'primaryType',
       COALESCE((
         SELECT jsonb_object_agg(s->>'dimensionId', (s->>'normalizedScore')::numeric)
         FROM jsonb_array_elements(p.scores) s
       ), '{}'::jsonb),
       NULLIF(p.truthfulness->>'score', '')::numeric
FROM public.employee_profiles p
JOIN public.employees e
  ON lower(btrim(p.employee_name)) IN (
       lower(btrim(e.first_name || ' ' || e.last_name)),
       lower(btrim(e.first_name))
     )
WHERE jsonb_typeof(p.scores) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM public.assessment_attempts a
    WHERE a.employee_uuid = e.uuid
      AND a.taken_at = p.created_at
  );