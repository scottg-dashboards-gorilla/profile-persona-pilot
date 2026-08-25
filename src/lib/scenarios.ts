/**
 * Compensation scenario simulator.
 * Takes the merit-matrix recommendation for each person and models what happens
 * under several raise budgets, protecting top performers when money is tight.
 */

import { amountFromPercent, percentFromAmount, type Rating } from "@/lib/compensation";

export type SimInput = {
  id: string;
  name: string;
  comp: number;
  rating: Rating | null;
  recPct: number;
};

export type Allocation = { id: string; amount: number; percent: number; shortfall: number };

export type ScenarioRow = {
  budgetPercent: number;
  budgetAmount: number;
  uncappedAmount: number;
  allocatedAmount: number;
  gap: number;
  utilisation: number;
  scaleFactor: number;
  avgPercent: number;
  overBudgetRisk: "none" | "medium" | "high";
  shortfallCount: number;
  topPerformerCount: number;
  topPerformersProtected: number;
  note: string;
  allocations: Allocation[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function simulateScenario(rows: SimInput[], budgetPercent: number): ScenarioRow {
  const payroll = rows.reduce((s, r) => s + r.comp, 0);
  const budgetAmount = Math.round((payroll * budgetPercent) / 100);
  const target = rows.map((r) => ({ row: r, want: amountFromPercent(r.comp, r.recPct) }));
  const uncappedAmount = target.reduce((s, t) => s + t.want, 0);

  const topPerformers = target.filter((t) => t.row.rating === "exceeds");
  const topWant = topPerformers.reduce((s, t) => s + t.want, 0);

  let allocations: Allocation[];
  let scaleFactor = 1;

  if (uncappedAmount <= budgetAmount || uncappedAmount === 0) {
    allocations = target.map((t) => ({
      id: t.row.id,
      amount: t.want,
      percent: t.row.recPct,
      shortfall: 0,
    }));
  } else if (topWant <= budgetAmount) {
    // Fund "exceeds" in full, then scale everyone else into what's left.
    const remaining = budgetAmount - topWant;
    const otherWant = uncappedAmount - topWant;
    scaleFactor = otherWant > 0 ? remaining / otherWant : 0;
    allocations = target.map((t) => {
      const isTop = t.row.rating === "exceeds";
      const amount = isTop ? t.want : Math.round(t.want * scaleFactor);
      return {
        id: t.row.id,
        amount,
        percent: percentFromAmount(t.row.comp, amount),
        shortfall: t.want - amount,
      };
    });
  } else {
    scaleFactor = budgetAmount / uncappedAmount;
    allocations = target.map((t) => {
      const amount = Math.round(t.want * scaleFactor);
      return {
        id: t.row.id,
        amount,
        percent: percentFromAmount(t.row.comp, amount),
        shortfall: t.want - amount,
      };
    });
  }

  const allocatedAmount = allocations.reduce((s, a) => s + a.amount, 0);
  const gap = uncappedAmount - budgetAmount;
  const shortfallCount = allocations.filter((a) => a.shortfall > 0).length;
  const topProtected = topPerformers.filter((t) => {
    const a = allocations.find((x) => x.id === t.row.id);
    return a ? a.shortfall <= 0 : false;
  }).length;

  const overshoot = budgetAmount > 0 ? uncappedAmount / budgetAmount : uncappedAmount > 0 ? 2 : 1;
  const overBudgetRisk: ScenarioRow["overBudgetRisk"] =
    overshoot <= 1 ? "none" : overshoot <= 1.15 ? "medium" : "high";

  const avgPercent = allocations.length
    ? allocations.reduce((s, a) => s + a.percent, 0) / allocations.length
    : 0;

  const note =
    overBudgetRisk === "none"
      ? "Every merit recommendation is fully funded, with headroom left for off-cycle adjustments."
      : overBudgetRisk === "medium"
        ? `Slightly short — ${shortfallCount} ${shortfallCount === 1 ? "person" : "people"} receive less than the matrix suggests.`
        : `Well over budget: recommendations cost ${Math.round((overshoot - 1) * 100)}% more than available, so ${shortfallCount} ${shortfallCount === 1 ? "person" : "people"} get trimmed.`;

  return {
    budgetPercent,
    budgetAmount,
    uncappedAmount,
    allocatedAmount,
    gap,
    utilisation: budgetAmount > 0 ? Math.round((allocatedAmount / budgetAmount) * 100) : 0,
    scaleFactor: round1(scaleFactor * 100) / 100,
    avgPercent: round1(avgPercent),
    overBudgetRisk,
    shortfallCount,
    topPerformerCount: topPerformers.length,
    topPerformersProtected: topProtected,
    note,
    allocations,
  };
}

export function simulateScenarios(rows: SimInput[], budgets: number[]): ScenarioRow[] {
  return [...budgets]
    .filter((b) => Number.isFinite(b))
    .sort((a, b) => a - b)
    .map((b) => simulateScenario(rows, b));
}
