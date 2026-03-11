import { LikertValue, Question, DimensionScore, DISCProfile, DISCType, TruthtfulnessResult } from "@/types/assessment";
import { questions, consistencyPairs } from "@/data/questions";
import { dimensions } from "@/data/dimensions";

/**
 * Reverse a Likert value: 1↔5, 2↔4, 3 stays.
 */
function reverseLikert(value: LikertValue): LikertValue {
  return (6 - value) as LikertValue;
}

/**
 * Get the effective score for a question's answer, accounting for reverse scoring.
 */
function effectiveScore(question: Question, answer: LikertValue): number {
  return question.reverseScored ? reverseLikert(answer) : answer;
}

/**
 * Calculate normalized scores (0–100) for all dimensions.
 */
export function calculateScores(
  answers: Record<string, LikertValue>
): DimensionScore[] {
  return dimensions.map((dim) => {
    const dimQuestions = questions.filter((q) => q.dimensionId === dim.id);
    const answered = dimQuestions.filter((q) => q.id in answers);

    if (answered.length === 0) {
      return { dimensionId: dim.id, normalizedScore: 50, rawSum: 0 };
    }

    const rawSum = answered.reduce(
      (sum, q) => sum + effectiveScore(q, answers[q.id]),
      0
    );

    const minPossible = answered.length;
    const maxPossible = answered.length * 5;
    const range = maxPossible - minPossible;

    const normalizedScore =
      range > 0 ? Math.round(((rawSum - minPossible) / range) * 100) : 50;

    return { dimensionId: dim.id, normalizedScore, rawSum };
  });
}

/**
 * Calculate DISC behavioral profile from dimension scores.
 */
export function calculateDISCProfile(scores: DimensionScore[]): DISCProfile {
  const getScore = (dimId: string) => scores.find(s => s.dimensionId === dimId)?.normalizedScore ?? 50;

  const profile = {
    D: getScore("disc-dominance"),
    I: getScore("disc-influence"),
    S: getScore("disc-steadiness"),
    C: getScore("disc-conscientiousness"),
  };

  const entries: [DISCType, number][] = [["D", profile.D], ["I", profile.I], ["S", profile.S], ["C", profile.C]];
  entries.sort((a, b) => b[1] - a[1]);

  return {
    ...profile,
    primaryType: entries[0][0],
    secondaryType: entries[1][0],
  };
}

/**
 * Calculate truthfulness/consistency score based on paired questions.
 * Compares how consistently a person answered rephrased versions of the same question.
 */
export function calculateTruthfulness(answers: Record<string, LikertValue>): TruthtfulnessResult {
  const inconsistentPairs: { q1Id: string; q2Id: string; delta: number }[] = [];
  let totalConsistency = 0;
  let pairCount = 0;

  for (const pair of consistencyPairs) {
    const tpAnswer = answers[pair.truthfulnessQuestionId];
    const origAnswer = answers[pair.originalQuestionId];

    if (tpAnswer === undefined || origAnswer === undefined) continue;

    const tpQuestion = questions.find(q => q.id === pair.truthfulnessQuestionId)!;
    const origQuestion = questions.find(q => q.id === pair.originalQuestionId)!;

    // Get effective scores (accounting for reverse scoring) for both questions
    const tpEffective = effectiveScore(tpQuestion, tpAnswer);
    const origEffective = effectiveScore(origQuestion, origAnswer);

    // Delta between the two effective scores (0 = perfectly consistent, 4 = maximally inconsistent)
    const delta = Math.abs(tpEffective - origEffective);

    // Consistency for this pair: 0-4 delta → 100-0 score
    const pairConsistency = Math.max(0, 100 - (delta * 25));
    totalConsistency += pairConsistency;
    pairCount++;

    if (delta >= 2) {
      inconsistentPairs.push({
        q1Id: pair.originalQuestionId,
        q2Id: pair.truthfulnessQuestionId,
        delta,
      });
    }
  }

  const score = pairCount > 0 ? Math.round(totalConsistency / pairCount) : 100;

  let label: string;
  if (score >= 80) label = "High";
  else if (score >= 60) label = "Moderate";
  else label = "Low";

  return { score, pairCount, inconsistentPairs, label };
}
