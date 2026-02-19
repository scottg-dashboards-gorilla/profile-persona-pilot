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

  return `HR Head Candidate Profile: ${archetype.name}
Hiring Recommendation: ${archetype.recommendationLabel}
Summary: ${archetype.summary}

Competency Scores:
${lines.join("\n")}

Context: This candidate is being assessed for a Head of HR role at a 100-person remote IT services company. The role requires running all of HR solo — recruiting, coaching managers, employee advocacy, compliance, culture building, and strategic HR leadership.`;
}
