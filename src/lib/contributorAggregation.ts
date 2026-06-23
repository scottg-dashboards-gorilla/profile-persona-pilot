export type AggregationMethod = "mean" | "median" | "weighted";

export type ContributorScore = {
  rating_overall: number | null;
  rating_collaboration: number | null;
  rating_impact: number | null;
  weight?: number | null;
};

function mean(vals: number[]) {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function median(vals: number[]) {
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function weightedMean(pairs: Array<[number, number]>) {
  const totalW = pairs.reduce((a, [, w]) => a + w, 0);
  if (totalW <= 0) return mean(pairs.map(([v]) => v));
  return pairs.reduce((a, [v, w]) => a + v * w, 0) / totalW;
}

export function aggregate(
  rows: ContributorScore[],
  key: "rating_overall" | "rating_collaboration" | "rating_impact",
  method: AggregationMethod,
): number | null {
  const usable = rows
    .map((r) => ({ v: r[key], w: Math.max(0, Number(r.weight ?? 1)) }))
    .filter((p): p is { v: number; w: number } => p.v != null);
  if (!usable.length) return null;
  if (method === "median") return median(usable.map((p) => p.v));
  if (method === "weighted") return weightedMean(usable.map((p) => [p.v, p.w]));
  return mean(usable.map((p) => p.v));
}

export function ratingBucket(overall: number | null): "exceeds" | "meets" | "below" | null {
  if (overall == null) return null;
  if (overall >= 4) return "exceeds";
  if (overall < 3) return "below";
  return "meets";
}

export const methodLabels: Record<AggregationMethod, string> = {
  mean: "Mean (simple average)",
  median: "Median",
  weighted: "Weighted by reviewer",
};