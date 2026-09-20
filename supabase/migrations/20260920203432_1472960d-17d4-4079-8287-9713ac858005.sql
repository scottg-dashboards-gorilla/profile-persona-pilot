ALTER TABLE public.performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_comp_approval_status_check;
ALTER TABLE public.performance_reviews ADD CONSTRAINT performance_reviews_comp_approval_status_check
  CHECK (comp_approval_status = ANY (ARRAY['not_required','pending','submitted','changes_requested','approved','rejected']));