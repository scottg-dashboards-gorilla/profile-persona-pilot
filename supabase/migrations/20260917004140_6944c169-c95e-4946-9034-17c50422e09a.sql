ALTER TABLE public.performance_reviews
  DROP COLUMN IF EXISTS equity_eligible,
  DROP COLUMN IF EXISTS equity_percent,
  DROP COLUMN IF EXISTS equity_value,
  DROP COLUMN IF EXISTS equity_price_per_share,
  DROP COLUMN IF EXISTS equity_shares;

ALTER TABLE public.manager_budgets
  DROP COLUMN IF EXISTS equity_budget_amount;