ALTER TABLE public.pdr_objectives
  ADD COLUMN IF NOT EXISTS goal_kind text NOT NULL DEFAULT 'kpi',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE public.pdr_objectives
  DROP CONSTRAINT IF EXISTS pdr_objectives_goal_kind_check;
ALTER TABLE public.pdr_objectives
  ADD CONSTRAINT pdr_objectives_goal_kind_check CHECK (goal_kind IN ('project', 'kpi', 'target'));