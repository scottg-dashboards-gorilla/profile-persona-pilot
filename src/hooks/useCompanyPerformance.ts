import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CURVE,
  fundingFor,
  type CompanyYear,
  type CurvePoint,
  type Funding,
  type Kpi,
} from "@/lib/companyPerformance";

export type YearBundle = {
  year: CompanyYear;
  kpis: Kpi[];
  curve: CurvePoint[];
  funding: Funding;
};

/** Loads every financial year with its KPI scorecard and funding curve. */
export function useCompanyPerformance() {
  const [bundles, setBundles] = useState<YearBundle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: years }, { data: kpis }, { data: curve }] = await Promise.all([
      supabase.from("company_performance_years").select("*").order("fiscal_year", { ascending: false }),
      supabase.from("company_kpis").select("*").order("sort_order"),
      supabase.from("funding_curve_points").select("*").order("achievement_percent"),
    ]);

    const list = ((years ?? []) as unknown as CompanyYear[]).map((year) => {
      const yKpis = ((kpis ?? []) as unknown as Kpi[]).filter((k: any) => k.year_id === year.id);
      const yCurve = ((curve ?? []) as unknown as (CurvePoint & { year_id: string })[]).filter(
        (p) => p.year_id === year.id,
      );
      const usedCurve = yCurve.length ? yCurve : DEFAULT_CURVE;
      return { year, kpis: yKpis, curve: usedCurve, funding: fundingFor(year, yKpis, usedCurve) };
    });

    setBundles(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { bundles, loading, reload: load };
}

/**
 * The pool that funds this calendar year's Annual Pay Review: the locked prior
 * financial year whose forecast targets the current year, else the newest year.
 */
export function useFundedPool(payoutYear = new Date().getFullYear()) {
  const { bundles, loading, reload } = useCompanyPerformance();
  const forYear =
    bundles.find((b) => b.year.forecast_for_year === payoutYear && b.year.status === "locked") ??
    bundles.find((b) => b.year.forecast_for_year === payoutYear) ??
    bundles.find((b) => b.year.status === "locked") ??
    bundles[0] ??
    null;
  return { bundle: forYear, loading, reload };
}
