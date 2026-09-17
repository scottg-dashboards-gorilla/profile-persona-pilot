CREATE OR REPLACE FUNCTION public.is_employee_manager(_employee_uuid text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT uuid FROM public.employees WHERE user_id = auth.uid() LIMIT 1
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e, me
    WHERE e.uuid::text = _employee_uuid
      AND e.manager_uuid = me.uuid
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_review_manager(_review_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT uuid FROM public.employees WHERE user_id = auth.uid() LIMIT 1
  ),
  r AS (
    SELECT employee_uuid FROM public.performance_reviews WHERE id = _review_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e, me, r
    WHERE e.uuid = r.employee_uuid
      AND e.manager_uuid = me.uuid
  )
$function$;