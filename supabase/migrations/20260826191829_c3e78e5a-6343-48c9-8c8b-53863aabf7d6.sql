CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS kickoff_at timestamptz;

UPDATE public.performance_reviews
   SET kickoff_at = COALESCE(self_assessment_sent_at, updated_at, created_at)
 WHERE kickoff_at IS NULL AND status <> 'scheduled';

CREATE TABLE public.review_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  contributor_id uuid REFERENCES public.review_contributors(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('self', 'contributor')),
  recipient_name text,
  recipient_email text,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX review_reminders_dedupe
  ON public.review_reminders (review_id, kind, COALESCE(contributor_id, '00000000-0000-0000-0000-000000000000'::uuid), due_date);

CREATE INDEX review_reminders_status_idx ON public.review_reminders (status, created_at);

GRANT SELECT ON public.review_reminders TO authenticated;
GRANT ALL ON public.review_reminders TO service_role;

ALTER TABLE public.review_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admin read all reminders"
  ON public.review_reminders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Managers read reminders for their team"
  ON public.review_reminders FOR SELECT TO authenticated
  USING (public.is_review_manager(review_id));

CREATE TRIGGER review_reminders_set_updated_at
  BEFORE UPDATE ON public.review_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

SELECT cron.schedule(
  'queue-review-reminders-daily',
  '0 13 * * *',
  $$SELECT public.queue_review_reminders(0, 200);$$
);