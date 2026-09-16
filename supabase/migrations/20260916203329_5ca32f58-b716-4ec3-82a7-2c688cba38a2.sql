ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS reopened_at timestamptz;
ALTER TABLE public.performance_reviews ADD COLUMN IF NOT EXISTS reopened_reason text;

COMMENT ON COLUMN public.performance_reviews.reopened_at IS 'Set when a completed review that was already shared is revised — outcome is pulled back until re-shared';
COMMENT ON COLUMN public.performance_reviews.reopened_reason IS 'Mandatory manager/HR explanation recorded when a shared review is reopened';