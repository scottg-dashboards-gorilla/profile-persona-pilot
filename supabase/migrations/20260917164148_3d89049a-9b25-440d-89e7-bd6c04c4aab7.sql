CREATE OR REPLACE FUNCTION public.is_my_manager(_employee_uuid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees me
    WHERE me.user_id = auth.uid()
      AND me.manager_uuid = _employee_uuid
  )
$$;

REVOKE ALL ON FUNCTION public.is_my_manager(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_my_manager(text) TO authenticated;

CREATE POLICY "Employees can view their own line manager"
ON public.employees FOR SELECT
TO authenticated
USING (public.is_my_manager(uuid));