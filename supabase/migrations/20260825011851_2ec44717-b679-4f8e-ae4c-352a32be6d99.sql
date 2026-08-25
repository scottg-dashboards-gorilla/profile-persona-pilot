CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  actor_email text,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admin can read audit log"
ON public.audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX audit_log_table_record_idx ON public.audit_log (table_name, record_id);

CREATE OR REPLACE FUNCTION public.record_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed jsonb := '{}'::jsonb;
  k text;
  old_j jsonb;
  new_j jsonb;
  rec_id text;
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'insert';
    new_j := to_jsonb(NEW);
    old_j := '{}'::jsonb;
  ELSIF TG_OP = 'UPDATE' THEN
    act := 'update';
    new_j := to_jsonb(NEW);
    old_j := to_jsonb(OLD);
  ELSE
    act := 'delete';
    new_j := '{}'::jsonb;
    old_j := to_jsonb(OLD);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(new_j) LOOP
      IF (new_j -> k) IS DISTINCT FROM (old_j -> k) AND k NOT IN ('updated_at') THEN
        changed := changed || jsonb_build_object(k, jsonb_build_object('from', old_j -> k, 'to', new_j -> k));
      END IF;
    END LOOP;
    IF changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  rec_id := COALESCE(new_j ->> 'id', old_j ->> 'id');

  INSERT INTO public.audit_log (actor_id, actor_email, table_name, record_id, action, changed_fields, summary)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    TG_TABLE_NAME,
    rec_id,
    act,
    changed,
    COALESCE(new_j ->> 'employee_name', new_j ->> 'name', old_j ->> 'employee_name', old_j ->> 'name')
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_performance_reviews
AFTER INSERT OR UPDATE OR DELETE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.record_audit();

CREATE TRIGGER audit_review_cycles
AFTER INSERT OR UPDATE OR DELETE ON public.review_cycles
FOR EACH ROW EXECUTE FUNCTION public.record_audit();

CREATE TRIGGER audit_review_contributors
AFTER INSERT OR UPDATE OR DELETE ON public.review_contributors
FOR EACH ROW EXECUTE FUNCTION public.record_audit();

CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.record_audit();