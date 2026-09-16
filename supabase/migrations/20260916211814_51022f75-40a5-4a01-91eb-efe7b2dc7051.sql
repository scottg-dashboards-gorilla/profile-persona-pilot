ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS connect_held_at timestamptz,
  ADD COLUMN IF NOT EXISTS connect_note text;

COMMENT ON COLUMN public.performance_reviews.connect_held_at IS 'When the manager held the face-to-face connect with the employee. Required before the pay outcome is shared.';
COMMENT ON COLUMN public.performance_reviews.connect_note IS 'Short note from the manager''s connect conversation with the employee.';