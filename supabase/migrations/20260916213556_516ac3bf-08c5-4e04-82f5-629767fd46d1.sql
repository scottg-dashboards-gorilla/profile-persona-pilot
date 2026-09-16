CREATE TABLE public.reminder_send_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id uuid,
  review_id uuid,
  employee_uuid text,
  employee_name text,
  kind text NOT NULL,
  recipient_name text,
  recipient_email text,
  due_date date,
  status text NOT NULL,
  error text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reminder_send_log TO authenticated;
GRANT ALL ON public.reminder_send_log TO service_role;

ALTER TABLE public.reminder_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admin can read the reminder send log"
ON public.reminder_send_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE INDEX reminder_send_log_employee_idx ON public.reminder_send_log (employee_uuid, attempted_at DESC);
CREATE INDEX reminder_send_log_attempted_idx ON public.reminder_send_log (attempted_at DESC);