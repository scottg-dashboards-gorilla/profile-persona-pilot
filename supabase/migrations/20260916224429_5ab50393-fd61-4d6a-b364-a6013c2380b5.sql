CREATE OR REPLACE FUNCTION public.sync_cycle_reviews(_cycle_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cy RECORD;
  added integer := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
          OR NOT EXISTS (SELECT 1 FROM public.user_roles)) THEN
    RAISE EXCEPTION 'Only HR or admin can sync a cycle.';
  END IF;

  SELECT * INTO cy FROM public.review_cycles WHERE id = _cycle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cycle not found.';
  END IF;

  WITH inserted AS (
    INSERT INTO public.performance_reviews (
      employee_uuid, employee_name, employee_email, department, title, hire_date,
      current_annual_comp, scheduled_date, review_cycle, status, cycle_id, review_type,
      fiscal_year
    )
    SELECT e.uuid,
           e.first_name || ' ' || e.last_name,
           e.email, e.department, e.title, e.hire_date, e.current_annual_comp,
           cy.ends_at, cy.name, 'scheduled', cy.id,
           COALESCE(cy.review_types[1], 'annual'),
           EXTRACT(YEAR FROM cy.ends_at)::int
      FROM public.employees e
     WHERE e.terminated = false
       AND (
         cy.scope_type IN ('all', 'company')
         OR (cy.scope_type = 'department' AND e.department = cy.scope_value)
         OR (cy.scope_type = 'manager' AND e.manager_uuid = cy.scope_value)
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.performance_reviews pr
          WHERE pr.cycle_id = cy.id AND pr.employee_uuid = e.uuid
       )
    RETURNING 1
  )
  SELECT count(*) INTO added FROM inserted;

  RETURN added;
END;
$function$;

INSERT INTO public.performance_reviews (
  employee_uuid, employee_name, employee_email, department, title, hire_date,
  current_annual_comp, scheduled_date, review_cycle, status, cycle_id, review_type, fiscal_year
)
SELECT e.uuid,
       e.first_name || ' ' || e.last_name,
       e.email, e.department, e.title, e.hire_date, e.current_annual_comp,
       cy.ends_at, cy.name, 'scheduled', cy.id,
       COALESCE(cy.review_types[1], 'annual'), 2026
  FROM public.employees e
 CROSS JOIN (SELECT * FROM public.review_cycles WHERE id = '11111111-1111-1111-1111-111111111111') cy
 WHERE e.terminated = false
   AND NOT EXISTS (
     SELECT 1 FROM public.performance_reviews pr
      WHERE pr.cycle_id = cy.id AND pr.employee_uuid = e.uuid
   );