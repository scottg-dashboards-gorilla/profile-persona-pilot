ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS comp_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS comp_submitted_by uuid;

CREATE OR REPLACE FUNCTION public.guard_comp_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.comp_approval_status = 'approved'
     AND OLD.comp_approval_status IS DISTINCT FROM 'approved'
     AND auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  THEN
    RAISE EXCEPTION 'Only HR or admin can approve a compensation change.';
  END IF;

  IF OLD.comp_approval_status = 'approved'
     AND NEW.comp_approval_status IS DISTINCT FROM 'approved'
     AND auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  THEN
    RAISE EXCEPTION 'Only HR or admin can change a pay outcome that has already been approved.';
  END IF;

  RETURN NEW;
END;
$$;