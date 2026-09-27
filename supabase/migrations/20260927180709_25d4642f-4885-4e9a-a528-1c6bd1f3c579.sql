UPDATE public.assessment_attempts
SET review_id = '331f8a08-f65d-4683-9ff5-861d8f0d51a5',
    cycle_id = '11111111-1111-1111-1111-111111111111',
    updated_at = now()
WHERE id = (
  SELECT id
  FROM public.assessment_attempts
  WHERE employee_uuid = 'e-060'
    AND submitted_at IS NOT NULL
    AND review_id IS NULL
  ORDER BY taken_at DESC
  LIMIT 1
)
AND EXISTS (
  SELECT 1
  FROM public.performance_reviews
  WHERE id = '331f8a08-f65d-4683-9ff5-861d8f0d51a5'
    AND assessment_attempt_id IS NULL
);

UPDATE public.performance_reviews
SET assessment_attempt_id = (
  SELECT id
  FROM public.assessment_attempts
  WHERE employee_uuid = 'e-060'
    AND review_id = '331f8a08-f65d-4683-9ff5-861d8f0d51a5'
  ORDER BY taken_at DESC
  LIMIT 1
),
updated_at = now()
WHERE id = '331f8a08-f65d-4683-9ff5-861d8f0d51a5'
  AND assessment_attempt_id IS NULL;