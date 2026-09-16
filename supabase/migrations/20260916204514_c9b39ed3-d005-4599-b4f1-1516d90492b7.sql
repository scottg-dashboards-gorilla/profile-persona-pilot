
CREATE OR REPLACE FUNCTION public.set_review_reviewer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mgr text;
  peer text;
BEGIN
  IF NEW.reviewer_uuid IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT manager_uuid INTO mgr FROM public.employees WHERE uuid = NEW.employee_uuid;

  IF mgr IS NULL THEN
    -- top of the chart: fall back to another top-level leader so the review is owned
    SELECT uuid INTO peer
      FROM public.employees
     WHERE manager_uuid IS NULL
       AND terminated = false
       AND uuid <> NEW.employee_uuid
     ORDER BY uuid
     LIMIT 1;
    mgr := peer;
  END IF;

  NEW.reviewer_uuid := mgr;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_review_reviewer_trg ON public.performance_reviews;
CREATE TRIGGER set_review_reviewer_trg
BEFORE INSERT OR UPDATE OF employee_uuid, reviewer_uuid ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_review_reviewer();

UPDATE public.performance_reviews r
   SET reviewer_uuid = e.manager_uuid
  FROM public.employees e
 WHERE e.uuid = r.employee_uuid
   AND r.reviewer_uuid IS NULL
   AND e.manager_uuid IS NOT NULL;

UPDATE public.performance_reviews r
   SET reviewer_uuid = (
     SELECT uuid FROM public.employees
      WHERE manager_uuid IS NULL AND terminated = false AND uuid <> r.employee_uuid
      ORDER BY uuid LIMIT 1
   )
 WHERE r.reviewer_uuid IS NULL;
