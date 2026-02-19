
-- Drop restrictive policies
DROP POLICY "Anyone can insert profiles" ON public.employee_profiles;
DROP POLICY "Anyone can view profiles" ON public.employee_profiles;
DROP POLICY "Anyone can delete profiles" ON public.employee_profiles;

-- Recreate as permissive policies
CREATE POLICY "Anyone can insert profiles"
ON public.employee_profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view profiles"
ON public.employee_profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete profiles"
ON public.employee_profiles
FOR DELETE
TO anon, authenticated
USING (true);
