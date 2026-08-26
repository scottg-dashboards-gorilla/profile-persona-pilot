CREATE OR REPLACE FUNCTION public.queue_review_reminders(_grace_days integer DEFAULT 0, _max integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  queued integer := 0;
  cap integer := LEAST(GREATEST(COALESCE(_max, 200), 1), 500);
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
     AND EXISTS (SELECT 1 FROM public.user_roles)
  THEN
    RAISE EXCEPTION 'Only HR or admin can queue review reminders.';
  END IF;

  WITH targets AS (
    SELECT 'self'::text AS kind,
           r.id AS review_id,
           NULL::uuid AS contributor_id,
           r.employee_name AS recipient_name,
           r.employee_email AS recipient_email,
           r.scheduled_date AS due_date
      FROM public.performance_reviews r
      LEFT JOIN public.review_self_assessments sa ON sa.review_id = r.id AND sa.submitted_at IS NOT NULL
     WHERE r.status = 'in_progress'
       AND sa.id IS NULL
       AND r.scheduled_date + COALESCE(_grace_days, 0) <= CURRENT_DATE
    UNION ALL
    SELECT 'contributor'::text,
           r.id,
           c.id,
           c.contributor_name,
           e.email,
           r.scheduled_date
      FROM public.review_contributors c
      JOIN public.performance_reviews r ON r.id = c.review_id
      LEFT JOIN public.employees e ON e.uuid = c.contributor_uuid
     WHERE r.status = 'in_progress'
       AND c.status <> 'submitted'
       AND r.scheduled_date + COALESCE(_grace_days, 0) <= CURRENT_DATE
  ),
  bounded AS (
    SELECT * FROM targets ORDER BY due_date LIMIT cap
  ),
  ins AS (
    INSERT INTO public.review_reminders
      (review_id, contributor_id, kind, recipient_name, recipient_email, due_date)
    SELECT review_id, contributor_id, kind, recipient_name, recipient_email, due_date
      FROM bounded
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO queued FROM ins;

  RETURN queued;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_review_reminders(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_review_reminders(integer, integer) TO authenticated, service_role;