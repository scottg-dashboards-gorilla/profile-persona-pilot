CREATE OR REPLACE FUNCTION public.is_in_management_chain(_employee_uuid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE me AS (SELECT uuid FROM employees WHERE user_id = auth.uid() LIMIT 1),
  chain AS (
    SELECT e.manager_uuid, 1 AS depth FROM employees e WHERE e.uuid = _employee_uuid
    UNION ALL
    SELECT e.manager_uuid, c.depth + 1 FROM employees e JOIN chain c ON e.uuid = c.manager_uuid
    WHERE c.manager_uuid IS NOT NULL AND c.depth < 20
  )
  SELECT EXISTS (SELECT 1 FROM chain, me WHERE chain.manager_uuid = me.uuid)
$$;
REVOKE EXECUTE ON FUNCTION public.is_in_management_chain(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_in_management_chain(text) TO authenticated;

DROP POLICY "Leaders read notes" ON public.performance_notes;
DROP POLICY "Leaders add notes" ON public.performance_notes;
DROP POLICY "Leaders edit notes" ON public.performance_notes;
DROP POLICY "Leaders read note history" ON public.performance_note_history;

CREATE POLICY "Leaders read notes" ON public.performance_notes FOR SELECT TO authenticated
USING (public.is_hr_or_admin() OR public.is_in_management_chain(employee_uuid)
  OR (public.is_self_employee(employee_uuid) AND note_type IN ('written_warning','final_warning','pip_referral')));
CREATE POLICY "Leaders add notes" ON public.performance_notes FOR INSERT TO authenticated
WITH CHECK ((public.is_hr_or_admin() OR public.is_in_management_chain(employee_uuid)) AND author_id = auth.uid());
CREATE POLICY "Leaders edit notes" ON public.performance_notes FOR UPDATE TO authenticated
USING (public.is_hr_or_admin() OR public.is_in_management_chain(employee_uuid))
WITH CHECK (public.is_hr_or_admin() OR public.is_in_management_chain(employee_uuid));
CREATE POLICY "Leaders read note history" ON public.performance_note_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.performance_notes n WHERE n.id = note_id
  AND (public.is_hr_or_admin() OR public.is_in_management_chain(n.employee_uuid))));