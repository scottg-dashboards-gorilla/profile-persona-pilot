ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS pay_pushback_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pay_pushback_raised_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_pushback_employee_note text,
  ADD COLUMN IF NOT EXISTS pay_pushback_manager_note text,
  ADD COLUMN IF NOT EXISTS pay_pushback_manager_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_pushback_hr_note text,
  ADD COLUMN IF NOT EXISTS pay_pushback_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_pushback_resolved_by uuid;

CREATE OR REPLACE FUNCTION public.raise_pay_concern(_review_id uuid, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.performance_reviews;
BEGIN
  SELECT pr.* INTO r
  FROM public.performance_reviews pr
  JOIN public.employees e ON e.uuid = pr.employee_uuid
  WHERE pr.id = _review_id AND e.user_id = auth.uid();

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Not your review';
  END IF;

  IF r.released_at IS NULL THEN
    RAISE EXCEPTION 'This outcome has not been shared with you yet';
  END IF;

  UPDATE public.performance_reviews
  SET pay_pushback_status = 'raised',
      pay_pushback_raised_at = now(),
      pay_pushback_employee_note = _note,
      updated_at = now()
  WHERE id = _review_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.raise_pay_concern(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.raise_pay_concern(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Signed-in users can view profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Signed-in users can update profiles" ON public.employee_profiles;

CREATE POLICY "employee_profiles_update_staff"
ON public.employee_profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'manager'));