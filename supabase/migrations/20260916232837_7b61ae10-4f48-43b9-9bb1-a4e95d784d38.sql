CREATE TABLE public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid text NOT NULL,
  title text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tasks TO authenticated;
GRANT ALL ON public.daily_tasks TO service_role;

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_tasks_select" ON public.daily_tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid));

CREATE POLICY "daily_tasks_insert" ON public.daily_tasks FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid));

CREATE POLICY "daily_tasks_update" ON public.daily_tasks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid));

CREATE POLICY "daily_tasks_delete" ON public.daily_tasks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR public.is_employee_manager(employee_uuid) OR public.is_self_employee(employee_uuid));

CREATE INDEX daily_tasks_employee_idx ON public.daily_tasks (employee_uuid, status, sort_order);

CREATE TRIGGER daily_tasks_updated_at BEFORE UPDATE ON public.daily_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();