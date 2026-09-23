/**
 * Datapath's DP INC core values. Employees grade themselves against each one
 * and their manager grades them too, so behaviour sits next to results.
 */
export type CoreValue = {
  code: "D" | "P" | "I" | "N" | "C";
  name: string;
  meaning: string;
  prompt: string;
};

export const CORE_VALUES: CoreValue[] = [
  {
    code: "D",
    name: "Do the Right Thing and Do the Thing Right",
    meaning: "Integrity first, then quality — no shortcuts that create work for someone else.",
    prompt: "Where did you choose the right call over the easy one, and where was the work done right first time?",
  },
  {
    code: "P",
    name: "People Matter Most",
    meaning: "Colleagues and clients are treated as people, not tickets.",
    prompt: "How did you support teammates or clients as people this period?",
  },
  {
    code: "I",
    name: "Ideas Bring Value (Innovation)",
    meaning: "Better ways of working are raised, tested and shared.",
    prompt: "What did you improve, automate or suggest that made things better?",
  },
  {
    code: "N",
    name: "Ninjas & Unicorns",
    meaning: "Expert at the craft, unique and authentic in how you show up.",
    prompt: "Where did your expertise show, and how did you keep growing it?",
  },
  {
    code: "C",
    name: "Customer Experience",
    meaning: "Clients feel looked after, informed and confident in us.",
    prompt: "What did clients experience because of you this period?",
  },
];

export const VALUE_SCALE: { score: number; label: string; hint: string }[] = [
  { score: 1, label: "Not yet", hint: "Behaviour worked against this value." },
  { score: 2, label: "Developing", hint: "Inconsistent — needs prompting." },
  { score: 3, label: "Lives it", hint: "Reliably does this. The expected standard." },
  { score: 4, label: "Strong", hint: "A visible example for others." },
  { score: 5, label: "Role model", hint: "Sets the standard across the business." },
];

export function valueByCode(code: string) {
  return CORE_VALUES.find((v) => v.code === code) ?? null;
}

/** Simple average of the manager's value scores, or null when nothing graded. */
export function averageScore(scores: (number | null | undefined)[]) {
  const nums = scores.filter((s): s is number => typeof s === "number");
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
