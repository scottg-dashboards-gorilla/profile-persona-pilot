ALTER TABLE public.pdr_objectives
  ADD COLUMN IF NOT EXISTS midyear_employee_comment text,
  ADD COLUMN IF NOT EXISTS midyear_manager_comment text;