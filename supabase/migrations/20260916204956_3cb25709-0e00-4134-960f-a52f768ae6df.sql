CREATE OR REPLACE FUNCTION public.claim_employee_link()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_emp public.employees;
  v_is_manager boolean := false;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('status', 'no_session');
  END IF;

  SELECT * INTO v_emp FROM public.employees
   WHERE user_id = v_uid AND coalesce(terminated, false) = false
   LIMIT 1;

  IF v_emp.uuid IS NULL THEN
    SELECT * INTO v_emp FROM public.employees
     WHERE lower(coalesce(email, '')) = v_email
       AND coalesce(terminated, false) = false
       AND user_id IS NULL
     ORDER BY created_at NULLS LAST
     LIMIT 1;

    IF v_emp.uuid IS NULL THEN
      RETURN jsonb_build_object('status', 'no_match', 'email', v_email);
    END IF;

    UPDATE public.employees SET user_id = v_uid WHERE uuid = v_emp.uuid;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.employees r
     WHERE r.manager_uuid = v_emp.uuid AND coalesce(r.terminated, false) = false
  ) INTO v_is_manager;

  IF v_is_manager THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'manager'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'status', 'linked',
    'employee_uuid', v_emp.uuid,
    'name', trim(coalesce(v_emp.first_name, '') || ' ' || coalesce(v_emp.last_name, '')),
    'manager', v_is_manager
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_employee_link() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_employee_link() TO authenticated;

COMMENT ON FUNCTION public.claim_employee_link() IS 'Links the signed-in account to its employee record by matching the work email, and grants the manager role when that person has direct reports.';