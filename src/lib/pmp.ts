/**
 * Shared rules for the two annual Datapath processes:
 *  - PMP  : PDR objectives -> mid-year check-in -> year-end self input -> manager comments -> score
 *  - APR  : rating (1-5) -> merit / bonus / I-C / exec pay-out -> budget gate -> HR -> COO & Finance -> payroll
 */

import type { Rating } from "@/lib/compensation";

/* ------------------------------- Rating scale ------------------------------- */

export type RatingScore = 1 | 2 | 3 | 4 | 5;

/**
 * The Global 5-point rating scale. Anchors are the official wording — every
 * employee receives one rating for overall performance, and that rating drives
 * the pay decision.
 */
export const RATING_SCALE: { score: RatingScore; label: string; short: string; tone: string }[] = [
  { score: 5, label: "Far Exceeded Expectations", short: "5 — Far Exceeded", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { score: 4, label: "Exceeded Expectations", short: "4 — Exceeded", tone: "bg-teal-100 text-teal-800 border-teal-200" },
  { score: 3, label: "Overall Met Expectations", short: "3 — Overall Met", tone: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { score: 2, label: "Partially Met Expectations", short: "2 — Partially Met", tone: "bg-amber-100 text-amber-900 border-amber-200" },
  { score: 1, label: "Did Not Meet Expectations", short: "1 — Did Not Meet", tone: "bg-red-100 text-red-800 border-red-200" },
];

/** The three lenses a manager is asked to think through before rating. */
export const RATING_LENSES: { id: string; label: string; questions: string[] }[] = [
  {
    id: "results",
    label: "Results",
    questions: [
      "What expected objectives did they achieve — and to what extent did they exceed?",
      "What was the quality of the deliverables and their work compared to peers?",
      "What objectives were missed or not fully achieved, and what caused the misses?",
    ],
  },
  {
    id: "impact",
    label: "Impact",
    questions: [
      "What were the impacts of the business results?",
      "How did the results elevate the business, the team or their direct reports?",
    ],
  },
  {
    id: "leadership",
    label: "Leadership",
    questions: [
      "In what ways did they live Datapath's values and uphold the Code of Conduct?",
      "How effective were they at leading team members and interacting with others?",
    ],
  },
];

/**
 * Datapath's strategy: give managers flexibility and ownership on pay decisions
 * for their teams. These are the three levers that flexibility runs through.
 */
export const PMP_PILLARS: { id: string; label: string; what: string }[] = [
  {
    id: "rating",
    label: "Performance Rating",
    what: "Assessment of employee performance on the Global 5-point rating scale, which determines pay decisions.",
  },
  {
    id: "merit",
    label: "Merit",
    what: "Flexibility to set base salary merit increases that reward individual contribution, through broad overlapping merit ranges.",
  },
  {
    id: "bonus",
    label: "Bonus",
    what: "Empowerment to recognise individual contribution in bonus pay-outs by setting Individual Contribution (I/C) scores.",
  },
];

/** Who owns what during the year-end process. */
export const PMP_ROLES: { id: string; label: string; points: string[] }[] = [
  {
    id: "managers",
    label: "People Managers",
    points: [
      "Act as owners: write feedback and assign a performance rating on the Global 5-point scale.",
      "Recognise people using manager discretion for merit, I/C score, differentiated merit and differentiated LTI where applicable.",
      "Stay within budget by differentiating the % increases across their team members.",
      "Have continuous dialogue with their team — feedback throughout the year, not just at year end.",
    ],
  },
  {
    id: "hrbp",
    label: "HRBP",
    points: [
      "Support managers and business leaders to take ownership of the year-end process.",
      "Collaborate with business leaders to review recommendations in the pay review tool against allocated budget and guidance/timelines.",
      "Ensure the business lands on budget.",
    ],
  },
];

/** The three steps to year-end, with the published windows. */
export const YEAR_END_STEPS: {
  n: number;
  label: string;
  window: string;
  owner: "Employee" | "Manager";
  what: string;
  href?: string;
}[] = [
  {
    n: 1,
    label: "Year-end self input",
    window: "Dec 01 – Dec 15",
    owner: "Employee",
    what: "Employees document how they made their goals a reality and the impact they had, entering their comments in their PDR form here.",
    href: "/pdr",
  },
  {
    n: 2,
    label: "Manager input",
    window: "Dec 15 – Jan 10",
    owner: "Manager",
    what: "Managers submit rating, merit and I/C in the pay review, and enter comments in their direct reports' PDRs (Dec 02 – Jan 06). Timelines can vary by team.",
    href: "/apr",
  },
  {
    n: 3,
    label: "Year-end conversations",
    window: "Feb 01 – Feb 15",
    owner: "Manager",
    what: "Dedicated time to give feedback, recognise achievements and communicate the pay changes that resulted from performance.",
  },
];

export function ratingMeta(score: number | null | undefined) {
  return RATING_SCALE.find((r) => r.score === score) ?? null;
}

export function ratingShort(score: number | null | undefined) {
  return ratingMeta(score)?.short ?? "—";
}

/** Bridges the 1-5 scale to the three merit bands used by the pay matrix. */
export function ratingBand(score: number | null | undefined): Rating | null {
  if (score == null) return null;
  if (score >= 4) return "exceeds";
  if (score === 3) return "meets";
  return "below";
}

export function scoreFromLegacy(rating: string | null | undefined): RatingScore | null {
  if (rating === "exceeds") return 4;
  if (rating === "meets") return 3;
  if (rating === "below") return 2;
  return null;
}

/* --------------------------------- PMP / PDR -------------------------------- */

export type PdrCategory = "faster" | "stronger" | "better" | "tpw";

export const PDR_CATEGORIES: { id: PdrCategory; label: string; blurb: string }[] = [
  { id: "faster", label: "Faster", blurb: "Speed, cycle time, responsiveness" },
  { id: "stronger", label: "Stronger", blurb: "Capability, resilience, growth" },
  { id: "better", label: "Better", blurb: "Quality, customer outcome, accuracy" },
  { id: "tpw", label: "TPW", blurb: "The Datapath Way — core value behaviours" },
];

export type PdrStage = "objectives" | "midyear" | "year_end" | "closed";

export const PDR_STAGES: { id: PdrStage; label: string; owner: "Employee" | "Manager" | "HR"; sla: string }[] = [
  { id: "objectives", label: "Objectives drafted & aligned", owner: "Employee", sla: "SLA: Jan & Feb" },
  { id: "midyear", label: "Mid-year check-in", owner: "Manager", sla: "Target: by Jun & Jul" },
  { id: "year_end", label: "Year-end self input & manager comments", owner: "Employee", sla: "Self input Dec 01–15 · comments Dec 02 – Jan 06" },
  { id: "closed", label: "Year-end PDR score recorded", owner: "HR", sla: "Year closed · conversations Feb 01–15" },
];

export type PdrForm = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  fiscal_year: number;
  review_id: string | null;
  stage: PdrStage;
  objectives_submitted_at: string | null;
  objectives_approved_at: string | null;
  objectives_revision_note: string | null;
  aspiration_conversation_at: string | null;
  midyear_checkin_at: string | null;
  midyear_manager_feedback: string | null;
  employee_self_input: string | null;
  self_input_submitted_at: string | null;
  manager_comments: string | null;
  comments_finalized_at: string | null;
  comments_revision_note: string | null;
  year_end_score: number | null;
  score_recorded_at: string | null;
};

export type PdrObjective = {
  id: string;
  form_id: string;
  category: PdrCategory;
  title: string;
  description: string | null;
  weight: number;
  progress_percent: number;
  status: string;
  cascaded_from_manager: boolean;
  manager_validated: boolean;
  sort_order: number;
};

/** Control C1 — every drafted objective must map to a category and be validated by the manager. */
export function c1Passed(objectives: PdrObjective[]) {
  return objectives.length > 0 && objectives.every((o) => o.manager_validated);
}

/** Weighted year-end score on the 1-5 scale, derived from objective progress. */
export function derivedPdrScore(objectives: PdrObjective[]): number | null {
  const totalWeight = objectives.reduce((s, o) => s + (o.weight || 0), 0);
  if (!totalWeight) return null;
  const weighted = objectives.reduce((s, o) => s + (o.progress_percent || 0) * (o.weight || 0), 0) / totalWeight;
  // 0% -> 1.0, 100% -> 4.0, above-plan progress can reach 5.
  const score = 1 + (Math.min(weighted, 133) / 100) * 3;
  return Math.round(Math.min(5, Math.max(1, score)) * 10) / 10;
}

export function pdrProgress(form: PdrForm, objectives: PdrObjective[]) {
  const done = [
    !!form.objectives_submitted_at,
    !!form.objectives_approved_at && c1Passed(objectives),
    !!form.midyear_checkin_at,
    !!form.self_input_submitted_at,
    !!form.comments_finalized_at,
    form.year_end_score != null,
  ];
  return { done: done.filter(Boolean).length, total: done.length, steps: done };
}

/* ----------------------------------- APR ----------------------------------- */

export type AprStage = "manager_entry" | "escalated" | "hr_review" | "coo_finance" | "closed";

export const APR_STAGES: {
  id: AprStage;
  label: string;
  owner: "Manager" | "HR / TR" | "COO & Finance" | "System";
  window: string;
  what: string;
}[] = [
  {
    id: "manager_entry",
    label: "Manager entry",
    owner: "Manager",
    window: "Dec – Jan 1st half",
    what: "Review self input, assign the 1–5 rating, then enter merit %, bonus, I/C score and any executive pay-out.",
  },
  {
    id: "escalated",
    label: "Over-budget exception",
    owner: "Manager",
    window: "Jan 1st half",
    what: "Entries above the team budget cannot be saved — they route to the next-level manager to approve or send back.",
  },
  {
    id: "hr_review",
    label: "HR / TR review",
    owner: "HR / TR",
    window: "Jan",
    what: "Finalize, enter promotions and verify bonus-eligible teams.",
  },
  {
    id: "coo_finance",
    label: "COO & Finance review",
    owner: "COO & Finance",
    window: "Jan 2nd half – Feb 1st half",
    what: "Pay equity check and final budget vs spend sign-off.",
  },
  {
    id: "closed",
    label: "Closed to payroll",
    owner: "System",
    window: "By Feb 1st half",
    what: "Ratings, merit and bonus locked; data submitted to payroll and comp summaries released.",
  },
];

export function aprStageMeta(stage: string | null | undefined) {
  return APR_STAGES.find((s) => s.id === stage) ?? APR_STAGES[0];
}

export function nextAprStage(stage: AprStage): AprStage | null {
  const order: AprStage[] = ["manager_entry", "hr_review", "coo_finance", "closed"];
  const i = order.indexOf(stage);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1];
}

/** Global target the individual/company scores must average to. */
export const IC_TARGET = 105;

export function icAverage(scores: (number | null | undefined)[]): number | null {
  const list = scores.filter((s): s is number => s != null);
  if (list.length === 0) return null;
  return Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10;
}

export type BudgetPot = "merit" | "bonus";

export type ManagerBudget = {
  id: string;
  manager_uuid: string;
  fiscal_year: number;
  merit_budget_amount: number;
  bonus_budget_amount: number;
  note: string | null;
};

/**
 * Merit and bonus draw from separate pots — leftover in one cannot fund the other.
 * The gate only bites for managers with 5 or more eligible reports (mirrored in the database).
 */
export function budgetGate(opts: {
  eligibleCount: number;
  budget: ManagerBudget | null;
  plannedMerit: number;
  plannedBonus: number;
}) {
  const enforced = opts.eligibleCount >= 5 && !!opts.budget;
  const meritOver = enforced ? opts.plannedMerit > (opts.budget?.merit_budget_amount ?? 0) : false;
  const bonusOver = enforced ? opts.plannedBonus > (opts.budget?.bonus_budget_amount ?? 0) : false;
  return {
    enforced,
    meritOver,
    bonusOver,
    blocked: meritOver || bonusOver,
    meritRemaining: (opts.budget?.merit_budget_amount ?? 0) - opts.plannedMerit,
    bonusRemaining: (opts.budget?.bonus_budget_amount ?? 0) - opts.plannedBonus,
  };
}
