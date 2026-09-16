CREATE OR REPLACE FUNCTION public.create_review_token(_review_id uuid, _kind text, _contributor_id uuid DEFAULT NULL::uuid, _days integer DEFAULT 60)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp text;
  new_token text;
BEGIN
  IF NOT (auth.uid() IS NULL
          OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
          OR public.is_review_manager(_review_id)
          OR NOT EXISTS (SELECT 1 FROM public.user_roles)) THEN
    RAISE EXCEPTION 'Not allowed to create access links for this review.';
  END IF;

  SELECT employee_uuid INTO emp FROM public.performance_reviews WHERE id = _review_id;
  IF emp IS NULL THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  IF _kind = 'contributor' AND _contributor_id IS NULL THEN
    RAISE EXCEPTION 'A contributor is required for a contributor link.';
  END IF;

  SELECT token INTO new_token
    FROM public.review_access_tokens
   WHERE review_id = _review_id
     AND kind = _kind
     AND contributor_id IS NOT DISTINCT FROM _contributor_id
     AND revoked = false
     AND expires_at > now()
   LIMIT 1;

  IF new_token IS NOT NULL THEN
    RETURN new_token;
  END IF;

  new_token := encode(gen_random_bytes(18), 'hex');
  INSERT INTO public.review_access_tokens
    (token, kind, review_id, contributor_id, employee_uuid, expires_at, created_by)
  VALUES
    (new_token, _kind, _review_id, _contributor_id, emp, now() + make_interval(days => _days), auth.uid());

  RETURN new_token;
END;
$function$;