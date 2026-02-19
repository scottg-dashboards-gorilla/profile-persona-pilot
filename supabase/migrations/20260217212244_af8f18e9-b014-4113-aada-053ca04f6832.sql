
-- Store completed employee personality profiles
CREATE TABLE public.employee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  scores JSONB NOT NULL,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS since user chose open access
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/insert
CREATE POLICY "Anyone can view profiles"
  ON public.employee_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert profiles"
  ON public.employee_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete profiles"
  ON public.employee_profiles FOR DELETE
  USING (true);
