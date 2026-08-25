/**
 * Reviewer calibration math: per-reviewer rating distributions, leniency/severity
 * detection versus the company mean, and suggested alignment adjustments.
 */

export type ReviewerSample = {
  reviewerKey: string;
  reviewerName: string;
  rating: number; // 1-5 scale
  subject?: string | null;
};

export type ReviewerStats = {
  reviewerKey: string;
  reviewerName: string;
  count: number;
  mean: number;
  median: number;
  spread: number; // standard deviation
  histogram: number[]; // buckets for ratings 1..5
  deviation: number; // mean - company mean
  zScore: number;
  bias: "lenient" | "severe" | "aligned" | "low-variance";
  outlier: boolean;
  suggestedAdjustment: number; // add this to each of their ratings to align
  note: string;
};

export function mean(v: number[]) {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

export function median(v: number[]) {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function stdDev(v: number[]) {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Minimum ratings before a reviewer is judged as an outlier. */
export const MIN_SAMPLE = 3;

export function calibrate(samples: ReviewerSample[]): {
  companyMean: number;
  companySpread: number;
  total: number;
  reviewers: ReviewerStats[];
} {
  const all = samples.map((s) => s.rating).filter((n) => Number.isFinite(n));
  const companyMean = mean(all);
  const companySpread = stdDev(all);

  const groups = new Map<string, ReviewerSample[]>();
  samples.forEach((s) => {
    if (!Number.isFinite(s.rating)) return;
    const list = groups.get(s.reviewerKey) ?? [];
    list.push(s);
    groups.set(s.reviewerKey, list);
  });

  const reviewers: ReviewerStats[] = [...groups.entries()].map(([key, rows]) => {
    const vals = rows.map((r) => r.rating);
    const m = mean(vals);
    const deviation = m - companyMean;
    const spread = stdDev(vals);
    const z = companySpread > 0 ? deviation / companySpread : 0;
    const histogram = [1, 2, 3, 4, 5].map(
      (b) => vals.filter((v) => Math.round(v) === b).length,
    );

    const enoughData = vals.length >= MIN_SAMPLE;
    const strong = Math.abs(deviation) >= 0.5 || Math.abs(z) >= 1;
    let bias: ReviewerStats["bias"] = "aligned";
    if (enoughData && strong) bias = deviation > 0 ? "lenient" : "severe";
    else if (enoughData && vals.length >= 4 && spread < 0.25) bias = "low-variance";

    const suggested = bias === "lenient" || bias === "severe" ? round1(-deviation) : 0;

    let note: string;
    if (bias === "lenient")
      note = `Rates ${round1(Math.abs(deviation))} above the company average. Review the top-rated cases before locking ratings.`;
    else if (bias === "severe")
      note = `Rates ${round1(Math.abs(deviation))} below the company average. Check whether expectations were communicated.`;
    else if (bias === "low-variance")
      note = "Almost every rating is identical — feedback may not be differentiating performance.";
    else if (!enoughData) note = `Only ${vals.length} rating${vals.length === 1 ? "" : "s"} — not enough to calibrate yet.`;
    else note = "In line with the company distribution.";

    return {
      reviewerKey: key,
      reviewerName: rows[0].reviewerName,
      count: vals.length,
      mean: round1(m),
      median: round1(median(vals)),
      spread: round1(spread),
      histogram,
      deviation: round1(deviation),
      zScore: round1(z),
      bias,
      outlier: bias === "lenient" || bias === "severe",
      suggestedAdjustment: suggested,
      note,
    };
  });

  reviewers.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  return {
    companyMean: round1(companyMean),
    companySpread: round1(companySpread),
    total: all.length,
    reviewers,
  };
}

export const ratingToNumber: Record<string, number> = {
  exceeds: 4.5,
  meets: 3,
  below: 2,
};

/** Ordered rating labels with their numeric anchors, low → high. */
export const ratingScale: { key: string; label: string; value: number }[] = [
  { key: "below", label: "Below", value: 2 },
  { key: "meets", label: "Meets", value: 3 },
  { key: "exceeds", label: "Exceeds", value: 4.5 },
];

/** Snap a numeric rating back onto the nearest label used by performance reviews. */
export function numberToRating(n: number): string {
  let best = ratingScale[0];
  ratingScale.forEach((r) => {
    if (Math.abs(r.value - n) < Math.abs(best.value - n)) best = r;
  });
  return best.key;
}

/** Apply a calibration shift to a label rating, returning the new label. */
export function shiftRating(rating: string, adjustment: number): string {
  const current = ratingToNumber[rating];
  if (current === undefined) return rating;
  const target = Math.max(1, Math.min(5, current + adjustment));
  return numberToRating(target);
}
