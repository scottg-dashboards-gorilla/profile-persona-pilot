/**
 * The published year-end calendar. These are the company dates from the PMP
 * pack — employees write their input first, managers reply, then the
 * conversations happen. Everything the app shows about deadlines comes
 * from here so one change updates every page.
 */
export type MilestoneId = "self_input" | "manager_input" | "conversations";

export type Milestone = {
  id: MilestoneId;
  label: string;
  who: "Employee" | "Manager" | "Employee & Manager";
  /** Month (1-12) and day the window opens, in the cycle's first calendar year. */
  start: { month: number; day: number };
  /** Month and day the window closes. `nextYear` when it falls into January+. */
  end: { month: number; day: number; nextYear?: boolean };
  detail: string;
};

export const MILESTONES: Milestone[] = [
  {
    id: "self_input",
    label: "Your year-end input",
    who: "Employee",
    start: { month: 12, day: 1 },
    end: { month: 12, day: 15 },
    detail: "Write what you delivered against each objective, and what you need support with.",
  },
  {
    id: "manager_input",
    label: "Manager input",
    who: "Manager",
    start: { month: 12, day: 15 },
    end: { month: 1, day: 10, nextYear: true },
    detail: "Your manager comments on what you shared and records their view.",
  },
  {
    id: "conversations",
    label: "Your conversation",
    who: "Employee & Manager",
    start: { month: 2, day: 1, },
    end: { month: 2, day: 15 },
    detail: "You and your manager talk it through face to face and agree next year's focus.",
  },
];

export type MilestoneWindow = {
  milestone: Milestone;
  start: Date;
  end: Date;
  status: "upcoming" | "open" | "closed";
  /** Days until it opens (upcoming) or until it closes (open). */
  days: number;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * The cycle a date belongs to, named by the calendar year the December window
 * opens in. December 2026 through February 2027 is all the 2026 cycle.
 */
export function cycleYearFor(ref: Date = new Date()) {
  return ref.getMonth() >= 10 ? ref.getFullYear() : ref.getFullYear() - 1;
}

/** February milestones sit in the calendar year after the December ones. */
function yearOffsetFor(m: Milestone) {
  return m.start.month <= 6 ? 1 : 0;
}

export function milestoneWindow(
  m: Milestone,
  cycleYear: number,
  ref: Date = new Date(),
): MilestoneWindow {
  const offset = yearOffsetFor(m);
  const start = new Date(cycleYear + offset, m.start.month - 1, m.start.day);
  const end = new Date(
    cycleYear + offset + (m.end.nextYear ? 1 : 0),
    m.end.month - 1,
    m.end.day,
    23,
    59,
    59,
  );
  const status = ref < start ? "upcoming" : ref > end ? "closed" : "open";
  const days = Math.max(
    0,
    Math.ceil(((status === "upcoming" ? start.getTime() : end.getTime()) - ref.getTime()) / DAY),
  );
  return { milestone: m, start, end, status, days };
}

export function cycleWindows(cycleYear: number, ref: Date = new Date()): MilestoneWindow[] {
  return MILESTONES.map((m) => milestoneWindow(m, cycleYear, ref));
}

/** The window a person should be acting on right now, if there is one. */
export function currentWindow(cycleYear: number, ref: Date = new Date()) {
  const windows = cycleWindows(cycleYear, ref);
  return windows.find((w) => w.status === "open") ?? windows.find((w) => w.status === "upcoming") ?? null;
}

export function formatWindow(w: MilestoneWindow) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    (w.start.getFullYear() !== w.end.getFullYear() ? ` ${d.getFullYear()}` : "");
  return `${fmt(w.start)} – ${fmt(w.end)}`;
}

export function windowStatusLabel(w: MilestoneWindow) {
  if (w.status === "open") return w.days === 0 ? "Closes today" : `Closes in ${w.days} day${w.days === 1 ? "" : "s"}`;
  if (w.status === "upcoming") return `Opens in ${w.days} day${w.days === 1 ? "" : "s"}`;
  return "Closed";
}
