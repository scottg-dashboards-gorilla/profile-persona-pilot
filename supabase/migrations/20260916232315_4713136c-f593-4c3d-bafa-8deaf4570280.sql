ALTER TABLE public.pdr_forms
  ADD COLUMN IF NOT EXISTS midyear_self_input text,
  ADD COLUMN IF NOT EXISTS midyear_self_submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS midyear_manager_submitted_at timestamp with time zone;