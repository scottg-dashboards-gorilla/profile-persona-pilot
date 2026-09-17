/**
 * Shared rules for the two Datapath processes:
 *  - PMP  : PDR objectives -> mid-year check-in -> year-end self input -> manager comments -> score
 *  - Pay review cycle : each person's pay review runs on their own start-date anniversary —
 *    rating (1-5) -> merit / I-C / exec pay-out -> budget gate -> HR approval -> shared with the employee
 */

import type { Rating } from "@/lib/compensation";

/* ------------------------------- Rating scale ------------------------------- */

export type RatingScore = 1 | 2 | 3 | 4 | 5;

/**
 * The Datapath 5-point rating scale. Anchors are the official Datapath wording — every
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
    what: "Assessment of employee performance on the Datapath 5-point rating scale, which determines pay decisions.",
  },
  {
    id: "merit",
    label: "Merit",
    what: "Flexibility to set base salary merit increases that reward individual contribution, through broad overlapping merit ranges.",
  },
  {
    id: "ic",
    label: "Individual Contribution",
    what: "Empowerment to recognise individual contribution by setting Individual Contribution (I/C) scores.",
  },
];

/** Who owns what during the year-end process. */
export const PMP_ROLES: { id: string; label: string; points: string[] }[] = [
  {
    id: "managers",
    label: "People Managers",
    points: [
      "Act as owners: write feedback and assign a performance rating on the Datapath 5-point scale.",
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
    what: "Managers enter comments in their direct reports' PDRs (Dec 02 – Jan 06). Rating, merit and I/C are entered in each person's own pay review, 3 weeks before their start-date anniversary.",
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

export type PdrCategory = "faster" | "stronger" | "better" | "ld";

export const PDR_CATEGORIES: { id: PdrCategory; label: string; blurb: string }[] = [
  {
    id: "faster",
    label: "Faster",
    blurb: "Speed and responsiveness — delivering work quicker, shortening cycle times, and removing blockers that slow the team down.",
  },
  {
    id: "stronger",
    label: "Stronger",
    blurb: "Capability and resilience — building deeper skills, stronger processes, and a team that can handle more without breaking.",
  },
  {
    id: "better",
    label: "Better",
    blurb: "Quality and outcomes — raising the bar on accuracy, customer experience, and the standard of the work itself.",
  },
  {
    id: "ld",
    label: "L&D",
    blurb: "Learning & Development — personal growth goals: new skills, certifications, mentoring, and career development.",
  },
];

export type PdrStage = "objectives" | "midyear" | "year_end" | "closed";

export const PDR_STAGES: { id: PdrStage; label: string; owner: "Employee & Manager"; sla: string }[] = [
  { id: "objectives", label: "Objective setting", owner: "Employee & Manager", sla: "Self input, then manager alignment · Jan–Feb" },
  { id: "midyear", label: "Mid-year review", owner: "Employee & Manager", sla: "Self input, then manager feedback · Jun–Jul" },
  { id: "year_end", label: "Year-end review", owner: "Employee & Manager", sla: "Self input Dec 01–15 · manager input Dec 02 – Jan 06" },
];

export function pdrStageLabel(stage: string | null | undefined) {
  if (stage === "closed") return "Year-end review · closed";
  return PDR_STAGES.find((s) => s.id === stage)?.label ?? String(stage ?? "—");
}

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
  midyear_self_input: string | null;
  midyear_self_submitted_at: string | null;
  midyear_manager_submitted_at: string | null;
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
  /** Manager's year-end comment for this objective category (optional). */
  manager_comment: string | null;
  setting_manager_comment: string | null;
  midyear_employee_comment: string | null;
  midyear_manager_comment: string | null;
};

/** Control C1 — every drafted objective must map to a category and be validated by the manager. */
export function c1Passed(objectives: PdrObjective[]) {
  return objectives.length > 0 && objectives.every((o) => o.manager_validated);
}

/** Year-end score on the 1-5 scale, derived from average objective progress (all objectives count equally). */
export function derivedPdrScore(objectives: PdrObjective[]): number | null {
  if (objectives.length === 0) return null;
  const weighted = objectives.reduce((s, o) => s + (o.progress_percent || 0), 0) / objectives.length;
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

/* ---------------------------- Pay review cycle ---------------------------- */

export type AprStage = "manager_entry" | "escalated" | "hr_review" | "coo_finance" | "closed";

export const APR_STAGES: {
  id: AprStage;
  label: string;
  owner: "Manager" | "HR" | "Employee";
  window: string;
  what: string;
}[] = [
  {
    id: "manager_entry",
    label: "Manager entry",
    owner: "Manager",
    window: "3 weeks before the anniversary",
    what: "Review self input, assign the 1–5 rating, then enter merit %, I/C score and any executive pay-out.",
  },
  {
    id: "escalated",
    label: "Over-budget exception",
    owner: "Manager",
    window: "Within the 3-week entry window",
    what: "Entries above the team budget cannot be saved — they route to the next-level manager to approve or send back.",
  },
  {
    id: "hr_review",
    label: "HR sign-off",
    owner: "HR",
    window: "By 2 weeks before the anniversary",
    what: "HR checks the rating, merit and I/C against budget and Datapath pay rules, then signs off the pay outcome. Nothing reaches the employee until this is done.",
  },
  {
    id: "closed",
    label: "Connect, then shared",
    owner: "Manager",
    window: "1 week before the anniversary",
    what: "The manager sits down with the employee for the connect conversation first, logs that it happened, and only then is the approved outcome shared on the employee's own review page. Pay changes take effect on the anniversary.",
  },
];

/* --------------------- Anniversary-based pay review dates ------------------- */

/** Manager entry opens this many days before someone's start-date anniversary. */
export const PAY_REVIEW_LEAD_DAYS = 21;

/** HR sign-off should be in place this many days before the anniversary. */
export const PAY_REVIEW_HR_DAYS = 14;

/** The connect conversation and sharing happen this many days before the anniversary. */
export const PAY_REVIEW_SHARE_DAYS = 7;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * The pay review anniversary that falls in the given calendar year for someone
 * who started on `hireDate`. Feb 29 starts land on Feb 28 in non-leap years.
 */
export function anniversaryInYear(hireDate: string | null | undefined, year: number): Date | null {
  if (!hireDate) return null;
  const hire = new Date(hireDate);
  if (Number.isNaN(hire.getTime())) return null;
  const month = hire.getUTCMonth();
  const day = hire.getUTCDate();
  const candidate = new Date(year, month, day);
  return candidate.getMonth() === month ? candidate : new Date(year, month + 1, 0);
}

export type PayReviewDue = {
  /** The anniversary this review is anchored to. */
  date: Date;
  /** Completed years of service reached on that date. */
  years: number;
  /** Negative = the anniversary has already passed. */
  daysUntil: number;
  /** Date manager entry opens. */
  opensOn: Date;
  status: "overdue" | "due" | "open" | "upcoming";
};

/**
 * Where someone sits in their own pay review cycle right now.
 * `open` means manager entry has opened; `due` means the anniversary is within a week.
 */
export function payReviewDue(
  hireDate: string | null | undefined,
  today: Date = new Date(),
): PayReviewDue | null {
  const ref = startOfDay(today);
  let date = anniversaryInYear(hireDate, ref.getFullYear());
  if (!date) return null;
  // Anniversaries more than a month past roll to next year's cycle.
  const monthAgo = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 30);
  if (date < monthAgo) {
    date = anniversaryInYear(hireDate, ref.getFullYear() + 1)!;
  }
  const hire = new Date(hireDate as string);
  const years = date.getFullYear() - hire.getUTCFullYear();
  const daysUntil = Math.round((date.getTime() - ref.getTime()) / 86_400_000);
  const opensOn = new Date(date.getFullYear(), date.getMonth(), date.getDate() - PAY_REVIEW_LEAD_DAYS);
  const status: PayReviewDue["status"] =
    daysUntil < 0 ? "overdue" : daysUntil <= 7 ? "due" : ref >= opensOn ? "open" : "upcoming";
  return { date, years, daysUntil, opensOn, status };
}

export const PAY_REVIEW_STATUS_LABEL: Record<PayReviewDue["status"], string> = {
  overdue: "Anniversary passed",
  due: "Connect & share week",
  open: "Open for manager entry",
  upcoming: "Not open yet",
};

/** The three key dates of one person's pay review, worked back from their anniversary. */
export function payReviewSchedule(anniversary: Date) {
  const back = (days: number) =>
    new Date(anniversary.getFullYear(), anniversary.getMonth(), anniversary.getDate() - days);
  return {
    managerEntryOpens: back(PAY_REVIEW_LEAD_DAYS),
    hrSignOffBy: back(PAY_REVIEW_HR_DAYS),
    connectAndShareBy: back(PAY_REVIEW_SHARE_DAYS),
    effectiveOn: anniversary,
  };
}

export function aprStageMeta(stage: string | null | undefined) {
  return APR_STAGES.find((s) => s.id === stage) ?? APR_STAGES[0];
}

export function nextAprStage(stage: AprStage): AprStage | null {
  const order: AprStage[] = ["manager_entry", "hr_review", "closed"];
  const i = order.indexOf(stage);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1];
}

/** Datapath-wide target the individual/company scores must average to. */
export const IC_TARGET = 105;

export function icAverage(scores: (number | null | undefined)[]): number | null {
  const list = scores.filter((s): s is number => s != null);
  if (list.length === 0) return null;
  return Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10;
}

export type BudgetPot = "merit";

export type ManagerBudget = {
  id: string;
  manager_uuid: string;
  fiscal_year: number;
  merit_budget_amount: number;
  equity_budget_amount?: number;
  note: string | null;
};


/**
 * Merit draws from the manager's merit pot.
 * The gate only bites for managers with 5 or more eligible reports (mirrored in the database).
 */
export function budgetGate(opts: {
  eligibleCount: number;
  budget: ManagerBudget | null;
  plannedMerit: number;
}) {
  const enforced = opts.eligibleCount >= 5 && !!opts.budget;
  const meritOver = enforced ? opts.plannedMerit > (opts.budget?.merit_budget_amount ?? 0) : false;
  return {
    enforced,
    meritOver,
    blocked: meritOver,
    meritRemaining: (opts.budget?.merit_budget_amount ?? 0) - opts.plannedMerit,
  };
}

/* ----------------------------- Governing principles ---------------------------- */

/**
 * Worked example of how a rating is decided: one set of objectives, then what
 * evidence at each point on the scale looks like. Used as the manager's anchor
 * so ratings stay evidence-based rather than impressionistic.
 */
export const RATING_EXAMPLE = {
  objectives: [
    {
      category: "faster" as PdrCategory,
      points: [
        "Streamline the approval process & review process by at least 2 business days.",
        "Complete 6 tax projects for client groups and deliver on time according to the tax timelines.",
      ],
    },
    {
      category: "stronger" as PdrCategory,
      points: [
        "Participate in a strategic 3-year team project to help expand functional capability. First year target is to revise and socialize the function capability framework with function leaders and employees.",
      ],
    },
    {
      category: "better" as PdrCategory,
      points: [
        "Leverage the Choose Inclusion Toolkit and Diagnostic Survey to foster an inclusive culture: identify the biggest opportunity areas in my team, identify 2-3 targeted actions, execute them and re-evaluate success within the year.",
      ],
    },
  ],
  evidence: [
    {
      score: 1 as RatingScore,
      points: [
        "Missed few key deadlines, causing major delays of the project.",
        "Peers often had to spend additional time to correct major mistakes.",
        "Worked on a capability development program, did not consult stakeholders of key deliverables and did not get buy-in from the business leaders.",
      ],
    },
    {
      score: 2 as RatingScore,
      points: [
        "Streamlined the review and approval process by a day.",
        "Some deadlines of deliverables were met but missed a few deadlines on shared project.",
        "Incorporated the Practicing the Datapath Values methodology to get things done fast.",
        "Made mistakes that required multiple revisions, which delayed the project deployment of the development program.",
      ],
    },
    {
      score: 3 as RatingScore,
      points: [
        "Streamlined the approval and review process by 2 days.",
        "Met the targeted timelines.",
        "Contributed to the development of a capability program.",
        "Coached the project team on the Practicing the Datapath Values methodology, which helped the project launch the framework on the targeted timeline.",
      ],
    },
    {
      score: 4 as RatingScore,
      points: [
        "Streamlined the approval and review process by 3 days.",
        "Provided alternative approaches for next year based on Datapath market research and stakeholder input.",
        "Took the lead on the framework design of the capability development program.",
        "Coached the project team on Practicing the Datapath Values that shortened feedback collections and the revision and reviews process, launched ahead to the targeted deadline.",
      ],
    },
    {
      score: 5 as RatingScore,
      points: [
        "Streamlined the approval and review process by 3 days.",
        "Secured a new vendor to leverage the digital platform that will automate the standard report output.",
        "Became a certified master coach in Practicing the Datapath Values and leveraged the methodology to lead the project team.",
        "The team is ahead of schedule on launching the capability framework.",
        "Helped other projects meeting deadlines in the function.",
      ],
    },
  ],
};

/**
 * Being aware of unconscious biases is a good reminder to keep to objective,
 * data or evidence-based performance evaluations.
 */
export const UNCONSCIOUS_BIASES: { label: string; what: string }[] = [
  { label: "Halo", what: "Inappropriate positive generalizations from one aspect of an individual's performance to all areas of that person's performance, like an outgoing personality." },
  { label: "Horn", what: "Inappropriate negative generalizations from one negative perception to all areas of that person's performance, like an unkept appearance." },
  { label: "Contrast", what: "The tendency is based on unfair comparison. For example, one employee might be rated lower than a top performer on every competency instead of fair acknowledgment what they do well." },
  { label: "Central", what: "The inclination to rate people in the middle of the scale even when their performance clearly warrants substantially higher or lower rating." },
  { label: "Recency / Spillover", what: "The tendency for minor events that have happened recently to have more influence on the rating than major events of many months ago; or the opposite, leaning more on earlier events than a holistic year review." },
  { label: "Leniency", what: "Consistently rating at the high-end of the scale. Employees will be happy to receive a glowing review but won't get constructive feedback that helps them improve." },
  { label: "First Impression", what: "Ratings reflect only initial observation of behavior, like relying on how an interview went." },
  { label: "Strictness", what: "This tendency causes managers to be overly critical and give low scores on most competencies. If not based on actual performance, it can cause employees to disengage." },
  { label: "Similar-to-Me", what: "This bias can result in managers giving preferential treatment to people they can relate to, like similar gender, age or race, but also similar working style, etc. This can lead to inaccurate evaluations and be non-inclusive." },
  { label: "Past Performance", what: "Permitting an individual's poor (or excellent) performance in a previous rating period to color the manager's judgment about her performance in this rating period." },
];

/** Merit increase — an increase to base salary that rewards prior-year individual performance. */
export const MERIT_PRINCIPLES = {
  what: "Merit Increase is an increase to an associate's base salary and is designed to reward individual performance for the prior year.",
  eligibility: "Merit eligible associates as per local policy.",
  delivery: "Each performance rating has an associated merit increase range — the higher the rating, the higher the range.",
  watchOuts: [
    "Managers cannot exceed the maximum of the merit increase range.",
    "For managers with teams of more than 5 associates, entries cannot be saved if the merit spend is higher than the merit budget.",
    "For managers with direct reports based in different countries, the budget will be shown in USD.",
  ],
};

/** The Team Score: four key metrics and their weightings. */
export const TEAM_SCORE_METRICS: { id: string; label: string; weight: number }[] = [
  { id: "net_revenue", label: "Net Revenue", weight: 30 },
  { id: "nopbt", label: "Net Operating Profit Before Taxes (NOPBT)", weight: 30 },
  { id: "rcp", label: "Relative Competitive Performance (RCP)", weight: 30 },
  { id: "cash_flow", label: "Cash Flow", weight: 10 },
];

export const BONUS_PRINCIPLES = {
  teamScore: "The Team Score is based on four key metrics — Net Revenue, NOPBT, Relative Competitive Performance and Cash Flow — and can range from 0–200% of the bonus target.",
  qualitative: "A qualitative review can adjust the 100% team score by +/- 15 points.",
  icScore: "The Individual Contribution (I/C) Score is based on individual performance and can range from 0–150% of the bonus target.",
  teamScoreMin: 0,
  teamScoreMax: 200,
  icMin: 0,
  icMax: 150,
  qualitativeSwing: 15,
};

/** I/C score rules — the lever managers use to differentiate bonus payouts. */
export const IC_PRINCIPLES = {
  what: "The I/C score allows managers to differentiate bonus payouts for bonus eligible employees.",
  eligibility: "Bonus eligible associates as per local policy.",
  watchOuts: [
    "The I/C Score is a multiplier of the overall team score, impacting the payout for each employee — allowing greater differentiation based on individual performance as per our strong pay-for-performance culture.",
    "Managers cannot exceed the maximum of the I/C Score range.",
    "For managers with teams of more than 5 bonus eligible associates, entries cannot be saved if the I/C Score average for the team is above budget.",
    `I/C Score average target is ${IC_TARGET}.`,
  ],
};

/** Who is in and out of the focal point (year-end) process. */
export const FOCAL_POINT_ELIGIBILITY: { id: string; label: string; points: string[] }[] = [
  {
    id: "new_hire",
    label: "New Hire",
    points: [
      "Associates hired on or before October 1 are included and merit increases will be prorated to the number of days worked during the performance year.",
      "New hires who join after October 1 are considered \"too new\" and do not receive a merit increase until the next merit cycle. That increase reflects a standard full-year merit increase with no pro-ration.",
    ],
  },
  {
    id: "promotion",
    label: "Promotion",
    points: [
      "Associates promoted on or before December 1 will be calibrated on their new, higher level.",
      "If promoted on or after December 2 they will be calibrated on their prior level.",
      "Associates transferred after December 1 will be evaluated by the previous manager.",
    ],
  },
  {
    id: "loa",
    label: "Leave of Absence",
    points: [
      "All associates under leave of absence, according to Datapath salary planning policy and local legislation, are eligible to receive a performance rating and participate in the merit increase program.",
    ],
  },
  {
    id: "not_eligible",
    label: "Not Eligible",
    points: [
      "Associates not eligible for the ratings process: terminated associates, retired associates, associates on LTD, interns, associates on severance pay and any other associates according to local legislation.",
    ],
  },
];

/**
 * Focal point eligibility for a hire date within a performance year:
 *  - hired on/before Oct 1  -> included, merit prorated by days worked
 *  - hired after Oct 1      -> too new, no merit this cycle
 */
export function focalPointMeritEligibility(hireDate: string | null | undefined, fiscalYear: number) {
  if (!hireDate) return { eligible: true, prorationFactor: 1, reason: "No hire date on record — treated as full year." };
  const hire = new Date(hireDate);
  const yearStart = new Date(Date.UTC(fiscalYear, 0, 1));
  const yearEnd = new Date(Date.UTC(fiscalYear, 11, 31));
  const cutoff = new Date(Date.UTC(fiscalYear, 9, 1)); // Oct 1
  if (hire > cutoff) {
    return { eligible: false, prorationFactor: 0, reason: "Hired after October 1 — too new for this merit cycle." };
  }
  if (hire <= yearStart) {
    return { eligible: true, prorationFactor: 1, reason: "Full performance year worked." };
  }
  const dayMs = 86_400_000;
  const daysWorked = Math.round((yearEnd.getTime() - hire.getTime()) / dayMs) + 1;
  const daysInYear = Math.round((yearEnd.getTime() - yearStart.getTime()) / dayMs) + 1;
  const factor = Math.max(0, Math.min(1, daysWorked / daysInYear));
  return {
    eligible: true,
    prorationFactor: Math.round(factor * 1000) / 1000,
    reason: `Merit prorated to ${daysWorked} of ${daysInYear} days worked.`,
  };
}

/** Promotion calibration level per the Dec 1 / Dec 2 rule. */
export function promotionCalibrationLevel(promotionDate: string | null | undefined, fiscalYear: number): "new" | "prior" | null {
  if (!promotionDate) return null;
  const d = new Date(promotionDate);
  return d <= new Date(Date.UTC(fiscalYear, 11, 1)) ? "new" : "prior";
}

/* --------------------------- Ranges used by the grid -------------------------- */

/** Merit increase range per rating — the higher the rating, the higher the range. */
export const MERIT_RANGES: Record<RatingScore, { min: number; max: number }> = {
  5: { min: 3.5, max: 6 },
  4: { min: 2.5, max: 4 },
  3: { min: 1.4, max: 2.5 },
  2: { min: 0, max: 1 },
  1: { min: 0, max: 0 },
};

/** I/C score range per rating. The team average must land on the target of 105. */
export const IC_RANGES: Record<RatingScore, { min: number; max: number }> = {
  5: { min: 125, max: 150 },
  4: { min: 110, max: 130 },
  3: { min: 95, max: 115 },
  2: { min: 50, max: 95 },
  1: { min: 0, max: 50 },
};

/** Differentiated Merit (DM) — an extra award on top of merit, for eligible associates only. */
export const DM_RANGE = { min: 0, max: 3.5 };

export function meritRange(score: number | null | undefined) {
  return score != null && score >= 1 && score <= 5 ? MERIT_RANGES[score as RatingScore] : null;
}

export function icRange(score: number | null | undefined) {
  return score != null && score >= 1 && score <= 5 ? IC_RANGES[score as RatingScore] : null;
}

/** Grid "Check" column: is the entered value inside the allowed range? */
export function withinRange(value: number | null | undefined, range: { min: number; max: number } | null) {
  if (range == null) return null;
  if (value == null) return null;
  return value >= range.min && value <= range.max;
}

/* ------------------------- Share awards (equity / LTI) ------------------------ */

/**
 * Datapath share awards (long-term incentive). The award is sized as a percent of
 * base salary within a range set by the performance rating, then converted to a
 * number of shares using the grant price for the year.
 */
export const EQUITY_RANGES: Record<RatingScore, { min: number; max: number }> = {
  5: { min: 10, max: 25 },
  4: { min: 6, max: 15 },
  3: { min: 3, max: 10 },
  2: { min: 0, max: 3 },
  1: { min: 0, max: 0 },
};

export function equityRange(score: number | null | undefined) {
  return score != null && score >= 1 && score <= 5 ? EQUITY_RANGES[score as RatingScore] : null;
}

/** Award value from salary and percent, plus the share count at the grant price. */
export function equityAward(opts: {
  salary: number | null | undefined;
  percent: number | null | undefined;
  pricePerShare: number | null | undefined;
}) {
  const salary = opts.salary ?? 0;
  if (opts.percent == null || salary <= 0) return { value: null as number | null, shares: null as number | null };
  const value = Math.round((salary * opts.percent) / 100);
  const price = opts.pricePerShare ?? 0;
  const shares = price > 0 ? Math.round(value / price) : null;
  return { value, shares };
}

