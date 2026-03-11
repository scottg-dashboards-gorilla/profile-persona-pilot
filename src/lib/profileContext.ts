import { DimensionScore } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { getArchetype } from "@/lib/archetypes";

/**
 * Build a text summary of the profile for the AI system prompt.
 */
export function buildProfileContext(scores: DimensionScore[]): string {
  const archetype = getArchetype(scores);
  const lines = scores.map((s) => {
    const dim = dimensions.find((d) => d.id === s.dimensionId)!;
    const label =
      s.normalizedScore <= 35
        ? dim.lowLabel
        : s.normalizedScore >= 65
        ? dim.highLabel
        : `Developing (${dim.lowLabel}/${dim.highLabel})`;
    const desc =
      s.normalizedScore <= 35
        ? dim.scoreDescriptions.low
        : s.normalizedScore >= 65
        ? dim.scoreDescriptions.high
        : dim.scoreDescriptions.mid;
    return `- ${dim.name}: ${s.normalizedScore}% → ${label}. ${desc}`;
  });

  return `Datapath MSP Team Leader Candidate Profile: ${archetype.name}
Hiring Recommendation: ${archetype.recommendationLabel}
Summary: ${archetype.summary}

Competency Scores:
${lines.join("\n")}

Context: This candidate is being assessed for a Team Leader role at Datapath, a managed service provider (MSP) that supports dozens of clients' infrastructure. The role requires leading by example, being a dynamic personality who thrives in a fast-paced multi-client environment, strong leadership and people skills, excellent problem solving, cultural fit, technical expertise across Microsoft Azure, M365, and security, and the ability to manage network engineers overseeing client infrastructure.`;
}
