ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS equity_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equity_percent numeric,
  ADD COLUMN IF NOT EXISTS equity_value numeric,
  ADD COLUMN IF NOT EXISTS equity_price_per_share numeric,
  ADD COLUMN IF NOT EXISTS equity_shares numeric;

ALTER TABLE public.manager_budgets
  ADD COLUMN IF NOT EXISTS equity_budget_amount numeric NOT NULL DEFAULT 0;