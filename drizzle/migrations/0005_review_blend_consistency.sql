CREATE OR REPLACE FUNCTION public.sync_review_rating_blend()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; v numeric; effective numeric;
BEGIN
 SELECT count(DISTINCT value_code),round(avg(manager_score),1) INTO n,v FROM public.review_value_ratings WHERE review_id=NEW.id AND value_code IN ('D','P','I','N','C') AND manager_score BETWEEN 1 AND 5;
 IF n<>5 THEN v:=NULL; END IF;
 NEW.values_avg_score:=v;
 effective:=CASE WHEN NEW.rating_score IS NULL THEN NULL WHEN v IS NULL THEN NEW.rating_score ELSE greatest(1,least(5,round(NEW.rating_score*0.7+v*0.3))) END;
 NEW.effective_rating_score:=effective;
 IF effective IS NOT NULL THEN NEW.overall_rating:=CASE WHEN effective>=4 THEN 'exceeds' WHEN effective=3 THEN 'meets' ELSE 'below' END; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_sync_review_rating_blend BEFORE INSERT OR UPDATE OF rating_score,values_avg_score,effective_rating_score ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.sync_review_rating_blend();

CREATE OR REPLACE FUNCTION public.refresh_review_value_blend()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.performance_reviews SET values_avg_score=values_avg_score WHERE id=COALESCE(NEW.review_id,OLD.review_id);
 RETURN COALESCE(NEW,OLD);
END $$;