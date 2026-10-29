CREATE OR REPLACE FUNCTION public.admin_staff_access()
RETURNS TABLE(employee_uuid text, account_id uuid, account_email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 IF NOT public.is_hr_or_admin() THEN RAISE EXCEPTION 'Admin or HR access required' USING ERRCODE = '42501'; END IF;
 RETURN QUERY SELECT e.uuid, u.id, u.email::text, u.email_confirmed_at, u.last_sign_in_at, u.banned_until
 FROM public.employees e LEFT JOIN LATERAL (
 SELECT a.id, a.email, a.email_confirmed_at, a.last_sign_in_at, a.banned_until FROM auth.users a
 WHERE a.id = e.user_id OR (e.user_id IS NULL AND nullif(trim(e.email),'') IS NOT NULL AND lower(a.email)=lower(trim(e.email)))
 ORDER BY (a.id = e.user_id) DESC LIMIT 1
 ) u ON true WHERE NOT e.terminated;
END; $$;
REVOKE ALL ON FUNCTION public.admin_staff_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_staff_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_staff_email(_employee_uuid text, _email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_email text := lower(trim(_email)); v_emp public.employees;
BEGIN
 IF NOT public.is_hr_or_admin() THEN RAISE EXCEPTION 'Admin or HR access required' USING ERRCODE = '42501'; END IF;
 IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid work email'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(v_email));
 SELECT * INTO v_emp FROM public.employees WHERE uuid = _employee_uuid AND NOT terminated FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active employee not found'; END IF;
 IF v_emp.user_id IS NOT NULL AND nullif(trim(v_emp.email),'') IS NOT NULL AND lower(trim(v_emp.email)) <> v_email THEN RAISE EXCEPTION 'This employee already has a linked sign-in. Contact IT to change their sign-in email.'; END IF;
 IF EXISTS (SELECT 1 FROM public.employees WHERE uuid <> _employee_uuid AND lower(trim(email)) = v_email) THEN RAISE EXCEPTION 'This email belongs to another staff record'; END IF;
 IF EXISTS (SELECT 1 FROM auth.users a JOIN public.employees e ON e.user_id=a.id WHERE lower(a.email)=v_email AND e.uuid<>_employee_uuid) THEN RAISE EXCEPTION 'This email belongs to another linked account'; END IF;
 UPDATE public.employees SET email=v_email WHERE uuid=_employee_uuid;
 RETURN v_email;
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_staff_email(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_email(text,text) TO authenticated;