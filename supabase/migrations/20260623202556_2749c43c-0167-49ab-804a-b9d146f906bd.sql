-- =========================================================
-- employees
-- =========================================================
CREATE TABLE public.employees (
  uuid text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  department text,
  title text,
  manager_uuid text REFERENCES public.employees(uuid) ON DELETE SET NULL,
  hire_date date,
  current_annual_comp numeric,
  payment_unit text,
  terminated boolean NOT NULL DEFAULT false,
  compensations jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO anon, authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Anyone can insert employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update employees" ON public.employees FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete employees" ON public.employees FOR DELETE USING (true);
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_employees_department ON public.employees(department);
CREATE INDEX idx_employees_manager ON public.employees(manager_uuid);

-- =========================================================
-- review_cycles
-- =========================================================
CREATE TABLE public.review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  review_types text[] NOT NULL DEFAULT ARRAY['manager']::text[],
  question_template jsonb,
  scope_type text NOT NULL DEFAULT 'all',
  scope_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_cycles TO anon, authenticated;
GRANT ALL ON public.review_cycles TO service_role;
ALTER TABLE public.review_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view review cycles" ON public.review_cycles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert review cycles" ON public.review_cycles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update review cycles" ON public.review_cycles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete review cycles" ON public.review_cycles FOR DELETE USING (true);
CREATE TRIGGER trg_review_cycles_updated_at BEFORE UPDATE ON public.review_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- performance_reviews
-- =========================================================
CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid text NOT NULL,
  employee_name text NOT NULL,
  employee_email text,
  department text,
  title text,
  hire_date date,
  current_annual_comp numeric,
  scheduled_date date NOT NULL,
  completed_date date,
  review_cycle text NOT NULL DEFAULT 'annual',
  status text NOT NULL DEFAULT 'scheduled',
  self_assessment_sent_at timestamptz,
  self_assessment_response text,
  manager_review_sent_at timestamptz,
  manager_review_response text,
  overall_rating text,
  comp_adjustment_amount numeric,
  comp_adjustment_percent numeric,
  comp_effective_date date,
  promotion boolean NOT NULL DEFAULT false,
  new_title text,
  notes text,
  cycle_id uuid REFERENCES public.review_cycles(id) ON DELETE SET NULL,
  review_type text NOT NULL DEFAULT 'manager',
  reviewer_uuid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_reviews TO anon, authenticated;
GRANT ALL ON public.performance_reviews TO service_role;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON public.performance_reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.performance_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reviews" ON public.performance_reviews FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete reviews" ON public.performance_reviews FOR DELETE USING (true);
CREATE TRIGGER trg_performance_reviews_updated_at BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_perf_reviews_employee ON public.performance_reviews(employee_uuid);
CREATE INDEX idx_perf_reviews_cycle ON public.performance_reviews(cycle_id);
CREATE INDEX idx_perf_reviews_status ON public.performance_reviews(status);
CREATE INDEX idx_perf_reviews_scheduled ON public.performance_reviews(scheduled_date);
CREATE UNIQUE INDEX uniq_active_review_per_cycle_type
  ON public.performance_reviews(employee_uuid, cycle_id, review_type)
  WHERE status NOT IN ('completed', 'cancelled');

-- =========================================================
-- goals
-- =========================================================
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid text NOT NULL,
  employee_name text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started',
  target_date date,
  parent_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'individual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO anon, authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view goals" ON public.goals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert goals" ON public.goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update goals" ON public.goals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete goals" ON public.goals FOR DELETE USING (true);
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_goals_employee ON public.goals(employee_uuid);
CREATE INDEX idx_goals_status ON public.goals(status);

-- =========================================================
-- goal_key_results
-- =========================================================
CREATE TABLE public.goal_key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  metric_type text NOT NULL DEFAULT 'percentage',
  starting_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 100,
  current_value numeric NOT NULL DEFAULT 0,
  unit text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_key_results TO anon, authenticated;
GRANT ALL ON public.goal_key_results TO service_role;
ALTER TABLE public.goal_key_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view key results" ON public.goal_key_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert key results" ON public.goal_key_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update key results" ON public.goal_key_results FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete key results" ON public.goal_key_results FOR DELETE USING (true);
CREATE TRIGGER trg_goal_key_results_updated_at BEFORE UPDATE ON public.goal_key_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_kr_goal ON public.goal_key_results(goal_id);