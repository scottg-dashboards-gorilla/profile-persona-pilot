import { DimensionScore, DISCProfile, TruthtfulnessResult, TierClassification } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { getArchetype } from "@/lib/archetypes";
import { classifyTier } from "@/lib/tierClassification";

/**
 * Build a text summary of the profile for the AI system prompt.
 */
export function buildProfileContext(
  scores: DimensionScore[],
  discProfile?: DISCProfile,
  truthfulness?: TruthtfulnessResult
): string {
  const archetype = getArchetype(scores);
  const tier = classifyTier(scores);

  const lines = scores.map((s) => {
    const dim = dimensions.find((d) => d.id === s.dimensionId);
    if (!dim) return null;
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
  }).filter(Boolean);

  // Coaching preferences
  const coachingScore = scores.find(s => s.dimensionId === "coaching-preferences")?.normalizedScore ?? 50;
  const coachingPrefs = coachingScore <= 35
    ? "This person prefers autonomy and direct, blunt feedback. They learn best independently and want space to figure things out. Don't over-manage them — check in periodically and be straightforward."
    : coachingScore >= 65
    ? "This person thrives with structured support — regular check-ins, hands-on coaching, and positive reinforcement. Build rapport before delivering critical feedback. They value mentorship and guided learning."
    : "This person responds well to a balanced approach — some structure with independence. Regular check-ins mixed with self-directed work. They can handle direct feedback but appreciate context and encouragement.";

  // Feedback style from individual answers
  const fbDirectness = scores.find(s => s.dimensionId === "coaching-preferences");

  let discSection = "";
  if (discProfile) {
    discSection = `

DISC Behavioral Profile: ${discProfile.primaryType}${discProfile.secondaryType}
- Dominance (D): ${discProfile.D}%
- Influence (I): ${discProfile.I}%
- Steadiness (S): ${discProfile.S}%
- Conscientiousness (C): ${discProfile.C}%
Primary style: ${discProfile.primaryType}, Secondary: ${discProfile.secondaryType}`;
  }

  let truthSection = "";
  if (truthfulness && truthfulness.score >= 0) {
    truthSection = `

Response Consistency Score: ${truthfulness.score}% (${truthfulness.label})
${truthfulness.inconsistentPairs.length > 0 ? `Inconsistent pairs detected: ${truthfulness.inconsistentPairs.length}` : "No significant inconsistencies detected."}
${truthfulness.score < 60 ? "⚠️ WARNING: Low consistency score — responses may not be trustworthy. Factor this heavily into your recommendations." : ""}`;
  }

  return `Datapath Technical Resource Assessment Profile: ${archetype.name}
Recommended Tier: ${tier.label} (${tier.confidence}% confidence)
Tier Reasoning: ${tier.reasoning}
Hiring Recommendation: ${archetype.recommendationLabel}
Summary: ${archetype.summary}

Coaching & Feedback Preferences:
${coachingPrefs}

Competency Scores:
${lines.join("\n")}
${discSection}
${truthSection}

Context: This person is being assessed for placement as a technical resource at Datapath, a managed service provider (MSP) that supports dozens of clients' infrastructure. Based on their scores, they may be placed as:
- Tier 1 (Help Desk/Junior): Basic support, follows procedures, needs guidance and mentoring
- Tier 2 (Senior Technician): Handles escalations, works independently, emerging leadership
- Team Leader: Leads the team, mentors others, manages client relationships, accountable for team performance

Technical questions are aligned with CompTIA certification domains (A+, Network+, Security+, Cloud+, CySA+, PenTest+, Data+, Server+).

IMPORTANT COACHING CONTEXT: When the user asks how to coach, provide feedback, or develop this resource, use the coaching preferences and DISC profile to tailor your advice specifically. For example:
- A high-D person responds to direct, results-focused feedback
- A high-I person responds to enthusiasm and public recognition
- A high-S person responds to patient, supportive guidance
- A high-C person responds to data-driven, specific feedback
- Consider their stated preferences for direct vs. gentle feedback, hands-on vs. independent learning, and check-in frequency`;
}
