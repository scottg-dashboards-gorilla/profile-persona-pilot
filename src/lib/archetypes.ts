import { DimensionScore } from "@/types/assessment";

interface Archetype {
  name: string;
  summary: string;
  recommendation: "strong-hire" | "hire" | "conditional" | "caution";
  conditions: (scores: Map<string, number>) => boolean;
}

const ALL_DIMS = ["leadership-example", "adaptability-dynamics", "problem-solving", "culture-communication", "azure-cloud", "m365-admin", "security-compliance", "network-infrastructure"];

const archetypes: Archetype[] = [
  {
    name: "The Complete MSP Team Leader",
    summary: "Exceptional across the board — strong leader, technically deep, adaptable, and a culture champion. This candidate can lead the Datapath team and drive outstanding service across all client accounts.",
    recommendation: "strong-hire",
    conditions: (s) => {
      const avg = ALL_DIMS.reduce((sum, d) => sum + (s.get(d) ?? 50), 0) / ALL_DIMS.length;
      const lowCount = ALL_DIMS.filter(d => (s.get(d) ?? 50) < 40).length;
      return avg >= 65 && lowCount === 0;
    },
  },
  {
    name: "The People-First Leader",
    summary: "Outstanding leadership, culture, and communication skills. They'll inspire the team and build strong client relationships, though they may need to deepen technical expertise in some areas.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("leadership-example") ?? 50) >= 65 &&
      (s.get("culture-communication") ?? 50) >= 65 &&
      (s.get("adaptability-dynamics") ?? 50) >= 60,
  },
  {
    name: "The Technical Powerhouse",
    summary: "Deep technical expertise across Azure, M365, security, and infrastructure. They'll solve the hardest problems and guide engineers effectively, though they may need to grow their people leadership and culture skills.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("azure-cloud") ?? 50) >= 65 &&
      (s.get("m365-admin") ?? 50) >= 60 &&
      (s.get("security-compliance") ?? 50) >= 60,
  },
  {
    name: "The Dynamic MSP Operator",
    summary: "Thrives in the fast-paced MSP environment — adaptable, great at problem-solving, and effective under pressure. They'll keep client operations running smoothly but may need to develop deeper leadership or technical skills.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("adaptability-dynamics") ?? 50) >= 65 &&
      (s.get("problem-solving") ?? 50) >= 65,
  },
  {
    name: "The Culture Builder",
    summary: "Strong communicator and culture champion who builds great client relationships and team morale. They'll create a positive Datapath environment, but may need to deepen technical expertise.",
    recommendation: "conditional",
    conditions: (s) =>
      (s.get("culture-communication") ?? 50) >= 65 &&
      (s.get("leadership-example") ?? 50) >= 55 &&
      (s.get("azure-cloud") ?? 50) < 50,
  },
  {
    name: "The Emerging Team Leader",
    summary: "Shows promise in several areas but has meaningful gaps that could be challenging in a team leader role at an MSP. Could succeed with mentoring and gradual scope expansion.",
    recommendation: "conditional",
    conditions: (s) => {
      const avg = ALL_DIMS.reduce((sum, d) => sum + (s.get(d) ?? 50), 0) / ALL_DIMS.length;
      const highCount = ALL_DIMS.filter(d => (s.get(d) ?? 50) >= 65).length;
      return avg >= 45 && avg < 65 && highCount >= 2;
    },
  },
  {
    name: "The Specialist, Not a Team Leader",
    summary: "Strong in specific areas but significant gaps in others. A Team Leader at Datapath needs breadth across leadership, technical, and client management domains — this candidate may struggle to cover all the bases.",
    recommendation: "caution",
    conditions: (s) => {
      const lowCount = ALL_DIMS.filter(d => (s.get(d) ?? 50) < 40).length;
      return lowCount >= 3;
    },
  },
];

const recommendationLabels: Record<string, { label: string; color: string; description: string }> = {
  "strong-hire": {
    label: "Strong Hire",
    color: "#10b981",
    description: "This candidate demonstrates exceptional qualifications across all key competencies for a Team Leader at Datapath. They can lead the team, manage client relationships, and drive technical excellence across all accounts.",
  },
  "hire": {
    label: "Recommended Hire",
    color: "#6366f1",
    description: "This candidate shows strong capabilities in the most critical areas. Some development areas exist but they're well-positioned to succeed as a Team Leader at Datapath.",
  },
  "conditional": {
    label: "Conditional — Proceed with Caution",
    color: "#f59e0b",
    description: "This candidate has notable strengths but also meaningful gaps. Consider whether Datapath can provide the support they'd need, or whether these gaps are dealbreakers.",
  },
  "caution": {
    label: "Not Recommended",
    color: "#ef4444",
    description: "This candidate has significant gaps in critical areas needed for a Team Leader role at Datapath. The risk of underperformance across client accounts is high.",
  },
};

export function getArchetype(scores: DimensionScore[]): { name: string; summary: string; recommendation: string; recommendationLabel: string; recommendationColor: string; recommendationDescription: string } {
  const scoreMap = new Map(scores.map((s) => [s.dimensionId, s.normalizedScore]));

  for (const a of archetypes) {
    if (a.conditions(scoreMap)) {
      const rec = recommendationLabels[a.recommendation];
      return {
        name: a.name,
        summary: a.summary,
        recommendation: a.recommendation,
        recommendationLabel: rec.label,
        recommendationColor: rec.color,
        recommendationDescription: rec.description,
      };
    }
  }

  const avg = ALL_DIMS.reduce((sum, d) => sum + (scoreMap.get(d) ?? 50), 0) / ALL_DIMS.length;
  const rec = avg >= 55 ? recommendationLabels["conditional"] : recommendationLabels["caution"];
  
  return {
    name: "Mixed Profile",
    summary: "This candidate shows a varied profile without a clear pattern of strength. Review individual dimension scores carefully to understand specific capabilities and gaps.",
    recommendation: avg >= 55 ? "conditional" : "caution",
    recommendationLabel: rec.label,
    recommendationColor: rec.color,
    recommendationDescription: rec.description,
  };
}
