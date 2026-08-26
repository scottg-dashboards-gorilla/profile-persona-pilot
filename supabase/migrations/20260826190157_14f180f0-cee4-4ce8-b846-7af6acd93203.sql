-- Trigger-only functions: never call directly from the API
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_review_assessment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_contributor_admin_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_comp_approval() FROM PUBLIC, anon, authenticated;

-- Internal permission helpers: used inside policies, not from the client
REVOKE ALL ON FUNCTION public.is_attempt_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_employee_manager(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_review_contributor(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_review_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_self_employee(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Token-gated entry points stay callable without an account
REVOKE ALL ON FUNCTION public.resolve_review_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_self_assessment(text, text, text, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_contributor_feedback(text, numeric, numeric, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_review_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_self_assessment(text, text, text, text, text, jsonb, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contributor_feedback(text, numeric, numeric, numeric, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.acknowledge_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_review(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_review_token(uuid, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_review_token(uuid, text, uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.sync_cycle_reviews(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_cycle_reviews(uuid) TO authenticated;