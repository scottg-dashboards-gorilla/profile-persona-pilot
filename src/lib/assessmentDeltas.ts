export type DiscScores = { D?: number; I?: number; S?: number; C?: number; primary?: string; primaryType?: string };
export type TechScores = Record<string, number | { normalizedScore?: number; score?: number }>;

export type AttemptRow = {
  id: string;
  employee_uuid: string;
  review_id: string | null;
  cycle_id: string | null;
  taken_at: string;
  submitted_at: string | null;
  disc_scores: DiscScores | null;
  disc_primary: string | null;
  tier: string | null;
  technical_scores: TechScores | null;
  truthfulness_score: number | null;
};

export type DiscDelta = { letter: "D" | "I" | "S" | "C"; from: number; to: number; delta: number };

const DISC_LETTERS: Array<"D" | "I" | "S" | "C"> = ["D", "I", "S", "C"];

export const tierLabel: Record<string, string> = {
  "tier-1": "Tier 1",
  tier_1: "Tier 1",
  "tier-2": "Tier 2",
  tier_2: "Tier 2",
  "team-leader": "Team Leader",
  team_leader: "Team Leader",
};

export function readableTier(t: string | null | undefined) {
  if (!t) return "—";
  return tierLabel[t] ?? t;
}

export function discDelta(prev: AttemptRow | null, curr: AttemptRow): DiscDelta[] {
  if (!curr.disc_scores) return [];
  return DISC_LETTERS.map((letter) => {
    const to = Number(curr.disc_scores?.[letter] ?? 0);
    const from = Number(prev?.disc_scores?.[letter] ?? 0);
    return { letter, from, to, delta: to - from };
  });
}

function normalizeTechValue(v: TechScores[string] | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object") {
    if (typeof v.normalizedScore === "number") return v.normalizedScore;
    if (typeof v.score === "number") return v.score;
  }
  return null;
}

export type CompetencyDelta = { id: string; from: number | null; to: number; delta: number | null };

export function technicalDelta(prev: AttemptRow | null, curr: AttemptRow): CompetencyDelta[] {
  const out: CompetencyDelta[] = [];
  const currT = curr.technical_scores ?? {};
  const prevT = prev?.technical_scores ?? {};
  for (const [id, val] of Object.entries(currT)) {
    const to = normalizeTechValue(val);
    if (to == null) continue;
    const from = normalizeTechValue(prevT[id] as TechScores[string]);
    out.push({ id, from, to, delta: from == null ? null : to - from });
  }
  return out.sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity));
}

export function tierChange(prev: AttemptRow | null, curr: AttemptRow) {
  return {
    from: prev?.tier ?? null,
    to: curr.tier,
    changed: !!prev && prev.tier !== curr.tier,
  };
}

/** Composite score for "biggest improvers" tile: weighted DISC + technical delta. */
export function compositeImprovement(prev: AttemptRow | null, curr: AttemptRow): number {
  if (!prev) return 0;
  const disc = discDelta(prev, curr).reduce((sum, d) => sum + Math.abs(d.delta), 0) / 4;
  const tech = technicalDelta(prev, curr);
  const techAvg =
    tech.length === 0
      ? 0
      : tech.reduce((s, d) => s + (d.delta ?? 0), 0) / tech.length;
  return techAvg + disc * 0.25;
}

export function pickLatestPair(attempts: AttemptRow[]): { current: AttemptRow | null; previous: AttemptRow | null } {
  const sorted = [...attempts].sort((a, b) => b.taken_at.localeCompare(a.taken_at));
  return { current: sorted[0] ?? null, previous: sorted[1] ?? null };
}

export function topMovers(
  deltas: CompetencyDelta[],
  direction: "up" | "down",
  count = 3,
): CompetencyDelta[] {
  return deltas
    .filter((d) => d.delta != null && (direction === "up" ? d.delta > 0 : d.delta < 0))
    .sort((a, b) => (direction === "up" ? (b.delta ?? 0) - (a.delta ?? 0) : (a.delta ?? 0) - (b.delta ?? 0)))
    .slice(0, count);
}