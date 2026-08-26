REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_audit() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_review_assessment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_contributor_admin_columns() FROM anon, authenticated;