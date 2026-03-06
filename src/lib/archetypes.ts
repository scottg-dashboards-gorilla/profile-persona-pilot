import { DimensionScore } from "@/types/assessment";

interface Archetype {
  name: string;
  summary: string;
  recommendation: "strong-hire" | "hire" | "conditional" | "caution";
  conditions: (scores: Map<string, number>) => boolean;
}

const archetypes: Archetype[] = [
  {
    name: "The Complete IT Leader",
    summary: "Exceptional across the board — technically deep, strategically sharp, and a proven people leader. This candidate can run the entire IT function and drive technology as a competitive advantage.",
    recommendation: "strong-hire",
    conditions: (s) => {
      const dims = ["microsoft-environment", "leadership-people", "strategic-thinking", "security-compliance", "problem-solving", "communication-culture", "process-operations", "pressure-resilience"];
      const avg = dims.reduce((sum, d) => sum + (s.get(d) ?? 50), 0) / dims.length;
      const lowCount = dims.filter(d => (s.get(d) ?? 50) < 40).length;
      return avg >= 65 && lowCount === 0;
    },
  },
  {
    name: "The Strategic Technology Partner",
    summary: "Strong strategic vision, excellent communication, and solid leadership skills. This candidate will elevate IT from a support function to a business driver, though may need support on deep technical issues.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("strategic-thinking") ?? 50) >= 65 &&
      (s.get("communication-culture") ?? 50) >= 65 &&
      (s.get("leadership-people") ?? 50) >= 60,
  },
  {
    name: "The Technical Operations Expert",
    summary: "Deep Microsoft expertise, strong processes, and excellent under pressure. They'll keep IT running like clockwork, though they may need to develop more strategic and communication capabilities.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("microsoft-environment") ?? 50) >= 65 &&
      (s.get("process-operations") ?? 50) >= 65 &&
      (s.get("pressure-resilience") ?? 50) >= 60,
  },
  {
    name: "The Security-First Innovator",
    summary: "Excels at security, compliance, and creative problem-solving. They'll protect the organization and drive innovation, but may need to grow in people management or strategic planning.",
    recommendation: "hire",
    conditions: (s) =>
      (s.get("security-compliance") ?? 50) >= 65 &&
      (s.get("problem-solving") ?? 50) >= 65,
  },
  {
    name: "The People-First Technologist",
    summary: "Strong leader and communicator who builds great teams and culture. They'll create a positive IT department, but may need to deepen technical expertise or process discipline.",
    recommendation: "conditional",
    conditions: (s) =>
      (s.get("leadership-people") ?? 50) >= 65 &&
      (s.get("communication-culture") ?? 50) >= 65 &&
      (s.get("microsoft-environment") ?? 50) < 50,
  },
  {
    name: "The Emerging IT Director",
    summary: "Shows promise in several areas but has meaningful gaps that could be challenging in a director-level role. Could succeed with mentoring and gradual scope expansion.",
    recommendation: "conditional",
    conditions: (s) => {
      const dims = ["microsoft-environment", "leadership-people", "strategic-thinking", "security-compliance", "problem-solving", "communication-culture", "process-operations", "pressure-resilience"];
      const avg = dims.reduce((sum, d) => sum + (s.get(d) ?? 50), 0) / dims.length;
      const highCount = dims.filter(d => (s.get(d) ?? 50) >= 65).length;
      return avg >= 45 && avg < 65 && highCount >= 2;
    },
  },
  {
    name: "The Specialist, Not a Director",
    summary: "Strong in specific areas but significant gaps in others. An IT Director role requires breadth across technical, leadership, and strategic domains — this candidate may struggle to cover all the bases.",
    recommendation: "caution",
    conditions: (s) => {
      const dims = ["microsoft-environment", "leadership-people", "strategic-thinking", "security-compliance", "problem-solving", "communication-culture", "process-operations", "pressure-resilience"];
      const lowCount = dims.filter(d => (s.get(d) ?? 50) < 40).length;
      return lowCount >= 3;
    },
  },
];

const recommendationLabels: Record<string, { label: string; color: string; description: string }> = {
  "strong-hire": {
    label: "Strong Hire",
    color: "#10b981",
    description: "This candidate demonstrates exceptional qualifications across all key IT leadership competencies. They are well-equipped to lead your IT function and drive technology as a competitive advantage.",
  },
  "hire": {
    label: "Recommended Hire",
    color: "#6366f1",
    description: "This candidate shows strong capabilities in the most critical areas. Some development areas exist but they're well-positioned to succeed as IT Director.",
  },
  "conditional": {
    label: "Conditional — Proceed with Caution",
    color: "#f59e0b",
    description: "This candidate has notable strengths but also meaningful gaps. Consider whether you can provide the support they'd need, or whether these gaps are dealbreakers for your situation.",
  },
  "caution": {
    label: "Not Recommended",
    color: "#ef4444",
    description: "This candidate has significant gaps in critical areas needed for an IT Director role. The risk of underperformance is high.",
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
  const dims = ["microsoft-environment", "leadership-people", "strategic-thinking", "security-compliance", "problem-solving", "communication-culture", "process-operations", "pressure-resilience"];
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
