CREATE OR REPLACE FUNCTION public.link_pdr_to_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_review uuid;
BEGIN
  IF NEW.review_id IS NULL THEN
    SELECT id INTO v_review FROM public.performance_reviews
     WHERE employee_uuid = NEW.employee_uuid
       AND (fiscal_year = NEW.fiscal_year OR review_cycle ILIKE '%' || NEW.fiscal_year::text || '%')
     ORDER BY (fiscal_year = NEW.fiscal_year) DESC, scheduled_date DESC NULLS LAST
     LIMIT 1;
    NEW.review_id := v_review;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_pdr_to_review_trg ON public.pdr_forms;
CREATE TRIGGER link_pdr_to_review_trg
BEFORE INSERT OR UPDATE OF employee_uuid, fiscal_year, review_id ON public.pdr_forms
FOR EACH ROW EXECUTE FUNCTION public.link_pdr_to_review();

CREATE OR REPLACE FUNCTION public.link_reviews_to_pdr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pdr_forms f
     SET review_id = NEW.id
   WHERE f.review_id IS NULL
     AND f.employee_uuid = NEW.employee_uuid
     AND (NEW.fiscal_year = f.fiscal_year OR NEW.review_cycle ILIKE '%' || f.fiscal_year::text || '%');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_reviews_to_pdr_trg ON public.performance_reviews;
CREATE TRIGGER link_reviews_to_pdr_trg
AFTER INSERT OR UPDATE OF fiscal_year, review_cycle ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.link_reviews_to_pdr();

UPDATE public.pdr_forms f
   SET review_id = r.id
  FROM public.performance_reviews r
 WHERE f.review_id IS NULL
   AND r.employee_uuid = f.employee_uuid
   AND (r.fiscal_year = f.fiscal_year OR r.review_cycle ILIKE '%' || f.fiscal_year::text || '%');

COMMENT ON FUNCTION public.link_pdr_to_review() IS 'Attaches a development review to that person''s pay review for the same year so the year-end score can be cross-checked against the pay rating.';