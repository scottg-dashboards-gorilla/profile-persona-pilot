alter table public.performance_reviews
  add column if not exists values_avg_score numeric,
  add column if not exists effective_rating_score numeric;

comment on column public.performance_reviews.values_avg_score is
  'Average of the manager''s DP INC core value scores for this review (1-5).';
comment on column public.performance_reviews.effective_rating_score is
  'Overall rating: 70% results rating + 30% core value average, rounded to the 1-5 scale.';