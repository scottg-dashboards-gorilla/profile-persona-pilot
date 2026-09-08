ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS dm_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dm_percent numeric,
  ADD COLUMN IF NOT EXISTS dm_amount numeric,
  ADD COLUMN IF NOT EXISTS merit_prorated_amount numeric,
  ADD COLUMN IF NOT EXISTS manager_summary_comment text;

ALTER TABLE public.pdr_objectives
  ADD COLUMN IF NOT EXISTS manager_comment text;