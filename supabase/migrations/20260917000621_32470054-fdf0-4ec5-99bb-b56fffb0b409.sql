ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'once';

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_cadence_check CHECK (cadence IN ('once','daily','weekly','monthly'));