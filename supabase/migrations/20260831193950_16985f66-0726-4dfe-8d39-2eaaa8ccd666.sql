-- Company performance years
CREATE TABLE public.company_performance_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year integer NOT NULL UNIQUE,
  label text,
  status text NOT NULL DEFAULT 'draft',
  people_cost numeric NOT NULL DEFAULT 0,
  achievement_percent numeric,
  pool_percent_override numeric,
  funded_pool_amount numeric,
  forecast_for_year integer,
  forecast_notes text,
  locked_at timestamp with time zone,
  locked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT company_performance_years_status_chk CHECK (status IN ('draft','locked'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_performance_years TO authenticated;
GRANT ALL ON public.company_performance_years TO service_role;
ALTER TABLE public.company_performance_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view company performance"
  ON public.company_performance_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR and admin can add company performance years"
  ON public.company_performance_years FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "HR and admin can edit company performance years"
  ON public.company_performance_years FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "HR and admin can delete company performance years"
  ON public.company_performance_years FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE TRIGGER company_performance_years_set_updated_at
  BEFORE UPDATE ON public.company_performance_years
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER audit_company_performance_years
  AFTER INSERT OR UPDATE OR DELETE ON public.company_performance_years
  FOR EACH ROW EXECUTE FUNCTION public.record_audit();

-- KPI scorecard
CREATE TABLE public.company_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES public.company_performance_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  target_value numeric NOT NULL DEFAULT 0,
  actual_value numeric,
  unit text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_kpis TO authenticated;
GRANT ALL ON public.company_kpis TO service_role;
ALTER TABLE public.company_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view company KPIs"
  ON public.company_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR and admin can add company KPIs"
  ON public.company_kpis FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "HR and admin can edit company KPIs"
  ON public.company_kpis FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "HR and admin can delete company KPIs"
  ON public.company_kpis FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE TRIGGER company_kpis_set_updated_at
  BEFORE UPDATE ON public.company_kpis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER audit_company_kpis
  AFTER INSERT OR UPDATE OR DELETE ON public.company_kpis
  FOR EACH ROW EXECUTE FUNCTION public.record_audit();

-- Funding curve
CREATE TABLE public.funding_curve_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id uuid NOT NULL REFERENCES public.company_performance_years(id) ON DELETE CASCADE,
  achievement_percent numeric NOT NULL,
  pool_percent numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (year_id, achievement_percent)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_curve_points TO authenticated;
GRANT ALL ON public.funding_curve_points TO service_role;
ALTER TABLE public.funding_curve_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view the funding curve"
  ON public.funding_curve_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR and admin can add funding curve points"
  ON public.funding_curve_points FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "HR and admin can edit funding curve points"
  ON public.funding_curve_points FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "HR and admin can delete funding curve points"
  ON public.funding_curve_points FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE TRIGGER funding_curve_points_set_updated_at
  BEFORE UPDATE ON public.funding_curve_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER audit_funding_curve_points
  AFTER INSERT OR UPDATE OR DELETE ON public.funding_curve_points
  FOR EACH ROW EXECUTE FUNCTION public.record_audit();

-- Block edits to a locked year (unlocking is still allowed for HR/admin)
CREATE OR REPLACE FUNCTION public.guard_locked_company_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y_id uuid;
  y RECORD;
BEGIN
  IF TG_TABLE_NAME = 'company_performance_years' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'locked' AND NEW.status = 'locked' THEN
      RAISE EXCEPTION 'This financial year is locked. Unlock it before making changes.';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  y_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE (to_jsonb(NEW)->>'year_id')::uuid END,
    (to_jsonb(OLD)->>'year_id')::uuid
  );
  SELECT * INTO y FROM public.company_performance_years WHERE id = y_id;
  IF y.status = 'locked' THEN
    RAISE EXCEPTION 'This financial year is locked. Unlock it before making changes.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER guard_locked_company_year_trg
  BEFORE UPDATE ON public.company_performance_years
  FOR EACH ROW EXECUTE FUNCTION public.guard_locked_company_year();

CREATE TRIGGER guard_locked_company_kpis
  BEFORE INSERT OR UPDATE OR DELETE ON public.company_kpis
  FOR EACH ROW EXECUTE FUNCTION public.guard_locked_company_year();

CREATE TRIGGER guard_locked_funding_curve
  BEFORE INSERT OR UPDATE OR DELETE ON public.funding_curve_points
  FOR EACH ROW EXECUTE FUNCTION public.guard_locked_company_year();
