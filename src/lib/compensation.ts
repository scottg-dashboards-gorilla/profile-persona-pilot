/**
 * Merit / salary-review math shared by the Compensation planner.
 * Kept pure so it is easy to test and reason about during audits.
 */

export type Rating = "exceeds" | "meets" | "below";

/** Composite growth signal from assessment deltas, bucketed for the merit matrix. */
export type GrowthBand = "up" | "flat" | "down";

export const MERIT_MATRIX: Record<Rating, Record<GrowthBand, number>> = {
  exceeds: { up: 8, flat: 6, down: 4.5 },
  meets: { up: 4.5, flat: 3, down: 2 },
  below: { up: 1.5, flat: 0, down: 0 },
};

export function growthBand(composite: number | null | undefined): GrowthBand {
  if (composite === null || composite === undefined) return "flat";
  if (composite >= 3) return "up";
  if (composite <= -3) return "down";
  return "flat";
}

/** Recommended merit increase percentage before any manual override. */
export function recommendedPercent(
  rating: Rating | null,
  composite: number | null,
  opts: { promotion?: boolean; monthsSinceLastRaise?: number | null } = {},
): number {
  if (!rating) return 0;
  let pct = MERIT_MATRIX[rating][growthBand(composite)];
  // Promotions carry a step increase on top of merit.
  if (opts.promotion) pct += 5;
  // Long gap since the last adjustment nudges the recommendation up slightly.
  if ((opts.monthsSinceLastRaise ?? 0) >= 18 && rating !== "below") pct += 1;
  return Math.round(pct * 10) / 10;
}

export function amountFromPercent(currentComp: number, percent: number): number {
  return Math.round((currentComp * percent) / 100);
}

export function percentFromAmount(currentComp: number, amount: number): number {
  if (!currentComp) return 0;
  return Math.round((amount / currentComp) * 1000) / 10;
}

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export type BudgetSummary = {
  payroll: number;
  budgetAmount: number;
  plannedAmount: number;
  remaining: number;
  plannedPercentOfPayroll: number;
  overBudget: boolean;
};

export function budgetSummary(
  payroll: number,
  budgetPercent: number,
  plannedAmount: number,
): BudgetSummary {
  const budgetAmount = Math.round((payroll * budgetPercent) / 100);
  return {
    payroll,
    budgetAmount,
    plannedAmount,
    remaining: budgetAmount - plannedAmount,
    plannedPercentOfPayroll: payroll ? Math.round((plannedAmount / payroll) * 1000) / 10 : 0,
    overBudget: plannedAmount > budgetAmount,
  };
}
