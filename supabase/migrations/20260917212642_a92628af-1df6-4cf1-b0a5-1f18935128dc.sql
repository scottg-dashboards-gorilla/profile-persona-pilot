ALTER TABLE public.performance_reviews DROP COLUMN IF EXISTS exec_payout_amount, DROP COLUMN IF EXISTS is_executive;

ALTER TABLE public.manager_budgets
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

INSERT INTO public.manager_budgets (manager_uuid, fiscal_year, merit_budget_amount)
SELECT e.manager_uuid, 2026, ROUND(SUM(COALESCE(e.current_annual_comp, 0)) * 0.05)
FROM public.employees e
WHERE e.manager_uuid IS NOT NULL AND e.terminated = false
GROUP BY e.manager_uuid
ON CONFLICT (manager_uuid, fiscal_year)
DO UPDATE SET merit_budget_amount = EXCLUDED.merit_budget_amount;