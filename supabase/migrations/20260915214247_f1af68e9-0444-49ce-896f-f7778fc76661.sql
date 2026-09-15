DROP POLICY IF EXISTS "employees_read_staff" ON public.employees;
CREATE POLICY "Datapath role holders can view employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS "Signed-in users can view review cycles" ON public.review_cycles;
CREATE POLICY "Datapath role holders can view review cycles"
  ON public.review_cycles
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));