ALTER TABLE public.performance_reviews DISABLE TRIGGER enforce_manager_apr_budget_trg;

UPDATE public.employees SET current_annual_comp = ROUND(current_annual_comp * 0.97, 2) WHERE current_annual_comp IS NOT NULL;

UPDATE public.performance_reviews SET current_annual_comp = ROUND(current_annual_comp * 0.97, 2) WHERE current_annual_comp IS NOT NULL;

UPDATE public.performance_reviews SET
  merit_amount = ROUND(merit_amount * 0.97, 2),
  comp_adjustment_amount = ROUND(comp_adjustment_amount * 0.97, 2)
WHERE merit_amount IS NOT NULL OR comp_adjustment_amount IS NOT NULL;

UPDATE public.comp_salary_history SET
  salary_2026 = ROUND(salary_2026 * 0.97, 2),
  salary_2025 = ROUND(salary_2025 * 0.97, 2),
  salary_2024 = ROUND(salary_2024 * 0.97, 2),
  salary_2023 = ROUND(salary_2023 * 0.97, 2);

UPDATE public.manager_budgets SET merit_budget_amount = ROUND(merit_budget_amount * 0.97, 2);

ALTER TABLE public.performance_reviews ENABLE TRIGGER enforce_manager_apr_budget_trg;