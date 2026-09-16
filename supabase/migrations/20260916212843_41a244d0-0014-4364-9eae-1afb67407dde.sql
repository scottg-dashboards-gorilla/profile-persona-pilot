ALTER TABLE public.review_reminders
  ALTER COLUMN review_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS employee_uuid text,
  ADD COLUMN IF NOT EXISTS employee_name text;

ALTER TABLE public.review_reminders DROP CONSTRAINT IF EXISTS review_reminders_kind_check;
ALTER TABLE public.review_reminders ADD CONSTRAINT review_reminders_kind_check
  CHECK (kind = ANY (ARRAY['self','contributor','manager_entry','hr_signoff','connect_share']));

CREATE UNIQUE INDEX IF NOT EXISTS review_reminders_milestone_uniq
  ON public.review_reminders (employee_uuid, kind, due_date)
  WHERE employee_uuid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.queue_anniversary_reminders(_window_days integer DEFAULT 0, _max integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  queued integer := 0;
  cap integer := LEAST(GREATEST(COALESCE(_max, 500), 1), 1000);
  win integer := LEAST(GREATEST(COALESCE(_window_days, 0), 0), 14);
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
     AND EXISTS (SELECT 1 FROM public.user_roles)
  THEN
    RAISE EXCEPTION 'Only HR or admin can queue anniversary reminders.';
  END IF;

  WITH people AS (
    SELECT e.uuid,
           trim(e.first_name || ' ' || e.last_name) AS name,
           e.manager_uuid,
           -- the anniversary in the current cycle (rolls to next year once a month past)
           CASE
             WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                            EXTRACT(MONTH FROM e.hire_date)::int,
                            LEAST(EXTRACT(DAY FROM e.hire_date)::int, 28))
                  < CURRENT_DATE - 30
             THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                            EXTRACT(MONTH FROM e.hire_date)::int,
                            LEAST(EXTRACT(DAY FROM e.hire_date)::int, 28))
             ELSE make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                            EXTRACT(MONTH FROM e.hire_date)::int,
                            LEAST(EXTRACT(DAY FROM e.hire_date)::int, 28))
           END AS anniversary
      FROM public.employees e
     WHERE COALESCE(e.terminated, false) = false
       AND e.hire_date IS NOT NULL
  ),
  milestones AS (
    SELECT p.*, m.kind, p.anniversary - m.lead AS milestone_date
      FROM people p
      CROSS JOIN (VALUES ('manager_entry', 21), ('hr_signoff', 14), ('connect_share', 7)) AS m(kind, lead)
     WHERE p.anniversary - m.lead BETWEEN CURRENT_DATE - win AND CURRENT_DATE
  ),
  targets AS (
    -- manager entry and the connect conversation go to the line manager
    SELECT ms.kind,
           ms.uuid AS employee_uuid,
           ms.name AS employee_name,
           trim(mg.first_name || ' ' || mg.last_name) AS recipient_name,
           mg.email AS recipient_email,
           ms.milestone_date AS due_date
      FROM milestones ms
      JOIN public.employees mg ON mg.uuid = ms.manager_uuid
     WHERE ms.kind IN ('manager_entry', 'connect_share')
    UNION ALL
    -- HR sign-off goes to everyone holding the HR or admin role
    SELECT ms.kind,
           ms.uuid,
           ms.name,
           trim(hr.first_name || ' ' || hr.last_name),
           hr.email,
           ms.milestone_date
      FROM milestones ms
      JOIN public.user_roles ur ON ur.role IN ('hr', 'admin')
      JOIN public.employees hr ON hr.user_id = ur.user_id AND COALESCE(hr.terminated, false) = false
     WHERE ms.kind = 'hr_signoff'
  ),
  bounded AS (
    SELECT DISTINCT ON (employee_uuid, kind, recipient_email) *
      FROM targets
     ORDER BY employee_uuid, kind, recipient_email, due_date
     LIMIT cap
  ),
  ins AS (
    INSERT INTO public.review_reminders
      (review_id, kind, employee_uuid, employee_name, recipient_name, recipient_email, due_date)
    SELECT NULL, kind, employee_uuid, employee_name, recipient_name, recipient_email, due_date
      FROM bounded
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO queued FROM ins;

  RETURN queued;
END;
$$;

SELECT cron.schedule(
  'queue-anniversary-reminders-daily',
  '30 13 * * *',
  $$ SELECT public.queue_anniversary_reminders(0, 500); $$
);