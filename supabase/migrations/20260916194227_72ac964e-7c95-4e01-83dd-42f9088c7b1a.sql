CREATE OR REPLACE FUNCTION public.enforce_comp_approved_before_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
    IF NEW.status <> 'completed' THEN
      RAISE EXCEPTION 'Cannot share the outcome: the review is not completed yet.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.comp_approval_status <> 'approved' THEN
      RAISE EXCEPTION 'Cannot share the outcome: HR must sign off on the pay outcome first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;