import { DimensionScore } from "@/types/assessment";

interface Archetype {
  name: string;
  summary: string;
  recommendation: "strong-hire" | "hire" | "conditional" | "caution";
  conditions: (scores: Map<string, number>) => boolean;
}

const archetypes: Archetype[] = [
  {
    name: "The Complete HR Leader",
    summary: "Exceptional across the board — strategic, organized, employee-focused, and compliance-savvy. This candidate can run the entire HR function independently and drive company growth.",
    recommendation: "strong-hire",
    conditions: (s) => {
      const dims = ["talent-acquisition", "leadership-coaching", "employee-advocacy", "compliance-risk", "pressure-resilience", "culture-building", "strategic-thinking", "initiative-drive"];
      const avg = dims.reduce((sum, d) => sum + (s.get(d) ?? 50), 0) / dims.length;
      const lowCount = dims.filter(d => (s.get(d) ?? 50) < 40).length;
      return avg >= 65 && lowCount === 0;
    },
  },
  {
    name: "The Strategic Culture Builder",
    summary: "Strong at strategic thinking, culture building, and employee advocacy. This candidate will elevate your people strategy and build a thriving remote culture, though may need support on compliance details.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("strategic-thinking") ?? 50) >= 65 &&
      (s.get("culture-building") ?? 50) >= 65 &&
      (s.get("employee-advocacy") ?? 50) >= 60,
  },
  {
    name: "The Operational Powerhouse",
    summary: "Highly organized, compliance-strong, and performs well under pressure. They'll keep the HR engine running smoothly, though they may need to develop more strategic and culture-building capabilities.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("pressure-resilience") ?? 50) >= 65 &&
      (s.get("compliance-risk") ?? 50) >= 65 &&
      (s.get("initiative-drive") ?? 50) >= 60,
  },
  {
    name: "The Talent & Coaching Specialist",
    summary: "Excels at recruiting and developing managers. They'll help you hire well and build leadership capability, but may need to grow in strategic business partnering or compliance areas.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("talent-acquisition") ?? 50) >= 65 &&
      (s.get("leadership-coaching") ?? 50) >= 65,
  },
  {
    name: "The People Champion",
    summary: "Deeply trusted by employees and strong at building culture. They'll create a workplace people love, but may need to develop harder-edged skills like compliance and strategic business alignment.",
    recommendation: "conditional",
    conditions: (s) =>
      (s.get("employee-advocacy") ?? 50) >= 65 &&
      (s.get("culture-building") ?? 50) >= 65 &&
      (s.get("compliance-risk") ?? 50) < 50,
  },
  {
    name: "The Emerging HR Leader",
    summary: "Shows promise in several areas but has meaningful gaps that could be challenging in a solo HR leadership role at a 100-person company. Could succeed with mentoring and gradual scope expansion.",
    recommendation: "conditional",
    conditions: (s) => {
      const dims = ["talent-acquisition", "leadership-coaching", "employee-advocacy", "compliance-risk", "pressure-resilience", "culture-building", "strategic-thinking", "initiative-drive"];
      const avg = dims.reduce((sum, d) => sum + (s.get(d) ?? 50), 0) / dims.length;
      const highCount = dims.filter(d => (s.get(d) ?? 50) >= 65).length;
      return avg >= 45 && avg < 65 && highCount >= 2;
    },
  },
  {
    name: "The Specialist, Not a Generalist",
    summary: "Strong in specific areas but significant gaps in others. Running an entire HR function solo requires breadth, and this candidate may struggle to cover all the bases a 100-person IT company needs.",
    recommendation: "caution",
    conditions: (s) => {
      const dims = ["talent-acquisition", "leadership-coaching", "employee-advocacy", "compliance-risk", "pressure-resilience", "culture-building", "strategic-thinking", "initiative-drive"];
      const lowCount = dims.filter(d => (s.get(d) ?? 50) < 40).length;
      return lowCount >= 3;
    },
  },
];

const recommendationLabels: Record<string, { label: string; color: string; description: string }> = {
  "strong-hire": {
    label: "Strong Hire",
    color: "#10b981",
    description: "This candidate demonstrates exceptional qualifications across all key HR competencies. They are well-equipped to lead your HR function and drive company growth.",
  },
  "hire": {
    label: "Recommended Hire",
    color: "#6366f1",
    description: "This candidate shows strong capabilities in the most critical areas. Some development areas exist but they're well-positioned to succeed in this role.",
  },
  "conditional": {
    label: "Conditional — Proceed with Caution",
    color: "#f59e0b",
    description: "This candidate has notable strengths but also meaningful gaps. Consider whether you can provide the support they'd need, or whether these gaps are dealbreakers for your situation.",
  },
  "caution": {
    label: "Not Recommended",
    color: "#ef4444",
    description: "This candidate has significant gaps in critical areas needed to run a full HR function at a 100-person company. The risk of underperformance is high.",
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

  // Fallback
  const dims = ["talent-acquisition", "leadership-coaching", "employee-advocacy", "compliance-risk", "pressure-resilience", "culture-building", "strategic-thinking", "initiative-drive"];
  const avg = dims.reduce((sum, d) => sum + (scoreMap.get(d) ?? 50), 0) / dims.length;
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
