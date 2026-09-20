CREATE TABLE IF NOT EXISTS public.assessment_check_in_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid text NOT NULL,
  requested_by uuid,
  requester_name text,
  note text,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  attempt_id uuid REFERENCES public.assessment_attempts(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_check_in_requests TO authenticated;
GRANT ALL ON public.assessment_check_in_requests TO service_role;

ALTER TABLE public.assessment_check_in_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "check_in_select_authorized"
ON public.assessment_check_in_requests FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_self_employee(employee_uuid)
  OR public.is_employee_manager(employee_uuid)
);

CREATE POLICY "check_in_insert_mgr_hr_admin"
ON public.assessment_check_in_requests FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_employee_manager(employee_uuid)
);

CREATE POLICY "check_in_update_authorized"
ON public.assessment_check_in_requests FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_employee_manager(employee_uuid)
  OR public.is_self_employee(employee_uuid)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_employee_manager(employee_uuid)
  OR public.is_self_employee(employee_uuid)
);

CREATE POLICY "check_in_delete_mgr_hr_admin"
ON public.assessment_check_in_requests FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.is_employee_manager(employee_uuid)
);

CREATE TRIGGER assessment_check_in_requests_set_updated_at
BEFORE UPDATE ON public.assessment_check_in_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();