ALTER TABLE public.performance_reviews
  DROP COLUMN IF EXISTS dm_eligible,
  DROP COLUMN IF EXISTS dm_percent,
  DROP COLUMN IF EXISTS dm_amount;