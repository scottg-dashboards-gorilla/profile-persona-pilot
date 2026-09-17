UPDATE public.employees e
SET current_annual_comp = COALESCE(h.salary_2026, h.salary_2025, h.salary_2024, h.salary_2023)
FROM public.comp_salary_history h
WHERE h.employee_uuid = e.uuid
  AND e.current_annual_comp IS NULL
  AND COALESCE(h.salary_2026, h.salary_2025, h.salary_2024, h.salary_2023) IS NOT NULL;

UPDATE public.performance_reviews r
SET current_annual_comp = e.current_annual_comp
FROM public.employees e
WHERE e.uuid = r.employee_uuid
  AND r.current_annual_comp IS NULL
  AND e.current_annual_comp IS NOT NULL;

INSERT INTO public.manager_budgets (manager_uuid, fiscal_year, merit_budget_amount)
SELECT e.manager_uuid, 2026, ROUND(SUM(COALESCE(e.current_annual_comp, 0)) * 0.05)
FROM public.employees e
WHERE e.manager_uuid IS NOT NULL AND e.terminated = false
GROUP BY e.manager_uuid
ON CONFLICT (manager_uuid, fiscal_year)
DO UPDATE SET merit_budget_amount = EXCLUDED.merit_budget_amount;