DROP POLICY IF EXISTS "read_department_questions" ON public.department_questions;

CREATE POLICY "read_department_questions" ON public.department_questions
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR department IS NULL
  OR department IN (
    SELECT e.department FROM public.employees e WHERE e.user_id = auth.uid()
    UNION
    SELECT r.department
      FROM public.employees r
      JOIN public.employees me ON me.user_id = auth.uid()
     WHERE r.manager_uuid = me.uuid
  )
);

DROP POLICY IF EXISTS "Signed-in users can submit assessment results" ON public.employee_profiles;

CREATE POLICY "employee_profiles_insert_staff" ON public.employee_profiles
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.has_role(auth.uid(), 'manager')
);