ALTER TABLE public.pdr_objectives
  ADD COLUMN IF NOT EXISTS measure_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS start_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_value numeric,
  ADD COLUMN IF NOT EXISTS current_value numeric,
  ADD COLUMN IF NOT EXISTS unit text;

ALTER TABLE public.pdr_objectives
  ADD CONSTRAINT pdr_objectives_measure_type_check
  CHECK (measure_type IN ('percentage','number','currency','milestone'));