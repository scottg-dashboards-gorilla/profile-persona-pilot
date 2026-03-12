import { DimensionScore, TierClassification, TierLevel } from "@/types/assessment";

const COMPETENCY_DIMS = ["leadership-example", "adaptability-dynamics", "problem-solving", "culture-communication", "azure-cloud", "m365-admin", "security-compliance", "network-infrastructure"];
const COMPTIA_DIMS = ["comptia-fundamentals", "comptia-data", "comptia-cyberops"];
const LEADERSHIP_DIMS = ["leadership-example", "adaptability-dynamics", "problem-solving", "culture-communication"];
const TECHNICAL_DIMS = ["azure-cloud", "m365-admin", "security-compliance", "network-infrastructure", ...COMPTIA_DIMS];

function avg(scores: DimensionScore[], dimIds: string[]): number {
  const relevant = scores.filter(s => dimIds.includes(s.dimensionId));
  if (relevant.length === 0) return 50;
  return relevant.reduce((sum, s) => sum + s.normalizedScore, 0) / relevant.length;
}

function get(scores: DimensionScore[], dimId: string): number {
  return scores.find(s => s.dimensionId === dimId)?.normalizedScore ?? 50;
}

/**
 * Classify a resource into Tier 1, Tier 2, or Team Leader based on their assessment scores.
 * 
 * Tier 1 (Entry/Help Desk): Basic technical skills, follows procedures, needs guidance
 * Tier 2 (Senior/Escalation): Strong technical skills, handles escalations, emerging leadership
 * Team Leader: Strong technical + leadership, can mentor others, manages client relationships
 */
export function classifyTier(scores: DimensionScore[]): TierClassification {
  const overallAvg = avg(scores, [...COMPETENCY_DIMS, ...COMPTIA_DIMS]);
  const leadershipAvg = avg(scores, LEADERSHIP_DIMS);
  const technicalAvg = avg(scores, TECHNICAL_DIMS);
  const selfAssessment = get(scores, "self-assessment");

  // Count dimensions above thresholds
  const allDims = [...COMPETENCY_DIMS, ...COMPTIA_DIMS];
  const highCount = allDims.filter(d => get(scores, d) >= 65).length;
  const lowCount = allDims.filter(d => get(scores, d) < 40).length;
  const midCount = allDims.filter(d => get(scores, d) >= 45 && get(scores, d) < 65).length;

  // Team Leader criteria
  if (
    overallAvg >= 62 &&
    leadershipAvg >= 60 &&
    technicalAvg >= 55 &&
    highCount >= 5 &&
    lowCount <= 1
  ) {
    const confidence = Math.min(100, Math.round(
      (overallAvg - 50) * 1.5 + 
      (leadershipAvg - 50) * 1.0 + 
      (highCount * 3) - 
      (lowCount * 10)
    ));
    return {
      tier: "team-leader",
      label: "Team Leader",
      confidence: Math.max(50, Math.min(100, confidence)),
      reasoning: `Strong across both leadership (${Math.round(leadershipAvg)}%) and technical (${Math.round(technicalAvg)}%) dimensions with ${highCount} competencies scoring 65%+. ${lowCount === 0 ? "No significant gaps." : "Only 1 minor gap."} This resource demonstrates the breadth and depth needed for a Team Leader role at Datapath.`,
    };
  }

  // Tier 2 criteria
  if (
    overallAvg >= 45 &&
    technicalAvg >= 45 &&
    highCount >= 2 &&
    lowCount <= 3
  ) {
    const confidence = Math.min(100, Math.round(
      (overallAvg - 35) * 1.2 + 
      (technicalAvg - 35) * 0.8 +
      (highCount * 4) -
      (lowCount * 5)
    ));

    let reasoning = `Solid technical foundation (${Math.round(technicalAvg)}%) with ${highCount} strong competencies. `;
    if (leadershipAvg < 55) {
      reasoning += `Leadership skills (${Math.round(leadershipAvg)}%) need development before a Team Leader move. `;
    }
    if (lowCount > 0) {
      const gaps = allDims.filter(d => get(scores, d) < 40);
      const gapNames = gaps.map(d => scores.find(s => s.dimensionId === d)?.dimensionId).filter(Boolean);
      reasoning += `${lowCount} area(s) need attention. `;
    }
    reasoning += "This resource is well-suited for a Tier 2 escalation/senior technician role with growth potential.";

    return {
      tier: "tier-2",
      label: "Tier 2 — Senior Technician",
      confidence: Math.max(40, Math.min(95, confidence)),
      reasoning,
    };
  }

  // Tier 1
  const confidence = Math.min(95, Math.round(50 + (lowCount * 5) - (highCount * 3)));
  return {
    tier: "tier-1",
    label: "Tier 1 — Help Desk / Junior",
    confidence: Math.max(40, Math.min(95, confidence)),
    reasoning: `Overall average of ${Math.round(overallAvg)}% with ${lowCount} gap areas and ${highCount} strong competencies. This resource would benefit from structured mentoring and skill development in a Tier 1 support role before advancing. ${selfAssessment >= 65 && overallAvg < 50 ? "Note: Self-assessment is significantly higher than objective scores — this gap should be addressed in coaching." : ""}`,
  };
}

export const TIER_COLORS: Record<TierLevel, string> = {
  "tier-1": "#f59e0b",
  "tier-2": "#38bdf8",
  "team-leader": "#00e676",
};

export const TIER_ICONS: Record<TierLevel, string> = {
  "tier-1": "🔧",
  "tier-2": "⚡",
  "team-leader": "👑",
};
