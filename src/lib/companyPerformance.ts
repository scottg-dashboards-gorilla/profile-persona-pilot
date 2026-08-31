/**
 * Company-performance funding math for the Annual Pay Review (APR) tool.
 *
 * Business achievement (a weighted KPI scorecard) drives the appraisal pool,
 * expressed as a percentage of total people cost via an editable funding curve
 * (e.g. 90% achievement funds 5%, 100% funds 7%, 120% funds 10%).
 */

export type Kpi = {
  id: string;
  name: string;
  weight: number;
  target_value: number;
  actual_value: number | null;
  unit: string | null;
  sort_order: number;
};

export type CurvePoint = {
  id?: string;
  achievement_percent: number;
  pool_percent: number;
};

export type CompanyYear = {
  id: string;
  fiscal_year: number;
  label: string | null;
  status: "draft" | "locked";
  people_cost: number;
  achievement_percent: number | null;
  pool_percent_override: number | null;
  funded_pool_amount: number | null;
  forecast_for_year: number | null;
  forecast_notes: string | null;
  locked_at: string | null;
  locked_by: string | null;
};

/** Default curve seeded for a new financial year. */
export const DEFAULT_CURVE: CurvePoint[] = [
  { achievement_percent: 80, pool_percent: 0 },
  { achievement_percent: 90, pool_percent: 5 },
  { achievement_percent: 100, pool_percent: 7 },
  { achievement_percent: 120, pool_percent: 10 },
];

/** Achievement of a single KPI: actual ÷ target, as a percentage. */
export function kpiAchievement(kpi: Pick<Kpi, "target_value" | "actual_value">): number | null {
  if (kpi.actual_value === null || kpi.actual_value === undefined) return null;
  if (!kpi.target_value) return null;
  return (Number(kpi.actual_value) / Number(kpi.target_value)) * 100;
}

/** Weighted blend of every scored KPI. Returns null when nothing is scored yet. */
export function blendedAchievement(kpis: Kpi[]): number | null {
  const scored = kpis
    .map((k) => ({ pct: kpiAchievement(k), w: Math.max(0, Number(k.weight ?? 0)) }))
    .filter((x): x is { pct: number; w: number } => x.pct !== null && x.w > 0);
  if (!scored.length) return null;
  const totalW = scored.reduce((a, x) => a + x.w, 0);
  const blended = scored.reduce((a, x) => a + x.pct * x.w, 0) / totalW;
  return Math.round(blended * 10) / 10;
}

/** Pool percentage of people cost at a given achievement, linearly interpolated on the curve. */
export function poolPercentAt(curve: CurvePoint[], achievement: number | null): number {
  if (achievement === null || achievement === undefined) return 0;
  const pts = [...curve]
    .filter((p) => Number.isFinite(p.achievement_percent) && Number.isFinite(p.pool_percent))
    .sort((a, b) => a.achievement_percent - b.achievement_percent);
  if (!pts.length) return 0;
  if (achievement <= pts[0].achievement_percent) return round1(pts[0].pool_percent);
  const last = pts[pts.length - 1];
  if (achievement >= last.achievement_percent) return round1(last.pool_percent);
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (achievement >= a.achievement_percent && achievement <= b.achievement_percent) {
      const span = b.achievement_percent - a.achievement_percent;
      const t = span === 0 ? 0 : (achievement - a.achievement_percent) / span;
      return round1(a.pool_percent + t * (b.pool_percent - a.pool_percent));
    }
  }
  return round1(last.pool_percent);
}

export type Funding = {
  achievement: number | null;
  curvePercent: number;
  poolPercent: number;
  overridden: boolean;
  peopleCost: number;
  poolAmount: number;
};

/** Everything the APR tool and the compensation planner need to size the pool. */
export function fundingFor(
  year: Pick<CompanyYear, "people_cost" | "achievement_percent" | "pool_percent_override">,
  kpis: Kpi[],
  curve: CurvePoint[],
): Funding {
  const achievement = blendedAchievement(kpis) ?? year.achievement_percent ?? null;
  const curvePercent = poolPercentAt(curve, achievement);
  const overridden =
    year.pool_percent_override !== null && year.pool_percent_override !== undefined;
  const poolPercent = overridden ? round1(Number(year.pool_percent_override)) : curvePercent;
  const peopleCost = Number(year.people_cost ?? 0);
  return {
    achievement,
    curvePercent,
    poolPercent,
    overridden,
    peopleCost,
    poolAmount: Math.round((peopleCost * poolPercent) / 100),
  };
}

/** Low / base / high forecast scenarios around the achieved result. */
export function forecastScenarios(
  peopleCost: number,
  curve: CurvePoint[],
  baseAchievement: number | null,
  spread = 10,
) {
  const base = baseAchievement ?? 100;
  return (
    [
      { key: "low", label: "Low", achievement: round1(base - spread) },
      { key: "base", label: "Base", achievement: round1(base) },
      { key: "high", label: "High", achievement: round1(base + spread) },
    ] as const
  ).map((s) => {
    const pct = poolPercentAt(curve, s.achievement);
    return { ...s, poolPercent: pct, poolAmount: Math.round((peopleCost * pct) / 100) };
  });
}

export function achievementTone(achievement: number | null): string {
  if (achievement === null) return "text-muted-foreground";
  if (achievement >= 100) return "text-emerald-700";
  if (achievement >= 90) return "text-amber-700";
  return "text-destructive";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
