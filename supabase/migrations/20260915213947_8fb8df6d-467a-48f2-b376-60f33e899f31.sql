DROP POLICY IF EXISTS "Signed-in users can view company KPIs" ON public.company_kpis;
CREATE POLICY "Datapath role holders can view company KPIs"
  ON public.company_kpis
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

DROP POLICY IF EXISTS "krs_read_authorized" ON public.goal_key_results;
CREATE POLICY "krs_read_role_holders"
  ON public.goal_key_results
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));