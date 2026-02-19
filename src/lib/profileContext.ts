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
        : `Balanced (${dim.lowLabel}/${dim.highLabel})`;
    const desc =
      s.normalizedScore <= 35
        ? dim.scoreDescriptions.low
        : s.normalizedScore >= 65
        ? dim.scoreDescriptions.high
        : dim.scoreDescriptions.mid;
    return `- ${dim.name}: ${s.normalizedScore}% → ${label}. ${desc}`;
  });

  return `Archetype: ${archetype.name} — ${archetype.summary}

Dimension Scores:
${lines.join("\n")}`;
}
