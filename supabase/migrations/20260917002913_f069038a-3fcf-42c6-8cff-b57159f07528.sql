CREATE POLICY "Employees can view their own record"
ON public.employees FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Employees can view their team leads"
ON public.employees FOR SELECT TO authenticated
USING (public.is_employee_manager(uuid));