CREATE OR REPLACE FUNCTION public.claim_employee_link()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_meta_name text := trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', ''));
  v_emp public.employees;
  v_is_manager boolean := false;
  v_local text;
  v_first text;
  v_last text;
  v_uuid text;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('status', 'no_session');
  END IF;

  SELECT * INTO v_emp FROM public.employees
   WHERE user_id = v_uid AND coalesce(terminated, false) = false
   LIMIT 1;

  -- 1) match by work email
  IF v_emp.uuid IS NULL THEN
    SELECT * INTO v_emp FROM public.employees
     WHERE lower(coalesce(email, '')) = v_email
       AND coalesce(terminated, false) = false
       AND user_id IS NULL
     ORDER BY created_at NULLS LAST
     LIMIT 1;
  END IF;

  -- 2) match by name on the account
  IF v_emp.uuid IS NULL AND v_meta_name <> '' THEN
    SELECT * INTO v_emp FROM public.employees
     WHERE coalesce(terminated, false) = false
       AND user_id IS NULL
       AND lower(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) = lower(v_meta_name)
     ORDER BY created_at NULLS LAST
     LIMIT 1;
  END IF;

  IF v_emp.uuid IS NOT NULL THEN
    UPDATE public.employees
       SET user_id = v_uid,
           email = coalesce(nullif(email, ''), v_email)
     WHERE uuid = v_emp.uuid;
  ELSE
    -- 3) no staff record at all: create one so the person has their own board
    v_local := split_part(v_email, '@', 1);
    v_uuid := 'dp-' || regexp_replace(lower(v_local), '[^a-z0-9]', '', 'g');
    IF v_meta_name <> '' AND position(' ' in v_meta_name) > 0 THEN
      v_first := split_part(v_meta_name, ' ', 1);
      v_last := trim(substr(v_meta_name, position(' ' in v_meta_name) + 1));
    ELSE
      v_first := coalesce(nullif(v_meta_name, ''), v_local);
      v_last := '';
    END IF;

    WHILE EXISTS (SELECT 1 FROM public.employees WHERE uuid = v_uuid) LOOP
      v_uuid := v_uuid || '-1';
    END LOOP;

    INSERT INTO public.employees (uuid, first_name, last_name, email, user_id, terminated)
    VALUES (v_uuid, v_first, v_last, v_email, v_uid, false)
    RETURNING * INTO v_emp;
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
$function$;