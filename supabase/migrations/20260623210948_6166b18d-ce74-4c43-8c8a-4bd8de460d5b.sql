
CREATE TABLE public.assessment_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.assessment_attempts(id) ON DELETE SET NULL,
  employee_uuid text NOT NULL,
  delta_kind text NOT NULL CHECK (delta_kind IN ('disc','technical','tier','general')),
  delta_key text,
  delta_from numeric,
  delta_to numeric,
  comment text,
  action text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done')),
  follow_up_review_id uuid REFERENCES public.performance_reviews(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX action_items_employee_idx ON public.assessment_action_items(employee_uuid, created_at DESC);
CREATE INDEX action_items_review_idx ON public.assessment_action_items(review_id);
CREATE INDEX action_items_attempt_idx ON public.assessment_action_items(attempt_id);
CREATE INDEX action_items_followup_idx ON public.assessment_action_items(follow_up_review_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_action_items TO authenticated;
GRANT ALL ON public.assessment_action_items TO service_role;

ALTER TABLE public.assessment_action_items ENABLE ROW LEVEL SECURITY;

-- Manager check by employee_uuid
CREATE OR REPLACE FUNCTION public.is_employee_manager(_employee_uuid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT uuid FROM public.employees WHERE user_id = auth.uid() LIMIT 1
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e, me
    WHERE e.uuid::text = _employee_uuid
      AND (
        e.manager_uuid = me.uuid
        OR e.manager_uuid IN (SELECT uuid FROM public.employees WHERE manager_uuid = me.uuid)
      )
  )
$$;

CREATE POLICY "action_items_select_authorized"
ON public.assessment_action_items FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_self_employee(employee_uuid)
  OR public.is_employee_manager(employee_uuid)
);

CREATE POLICY "action_items_insert_mgr_hr_admin"
ON public.assessment_action_items FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_employee_manager(employee_uuid)
);

CREATE POLICY "action_items_update_mgr_hr_admin"
ON public.assessment_action_items FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_employee_manager(employee_uuid)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_employee_manager(employee_uuid)
);

CREATE POLICY "action_items_delete_admin_hr"
ON public.assessment_action_items FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE TRIGGER assessment_action_items_set_updated_at
BEFORE UPDATE ON public.assessment_action_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
