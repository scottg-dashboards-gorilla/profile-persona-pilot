import { LikertValue, Question, DimensionScore } from "@/types/assessment";
import { questions } from "@/data/questions";
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
 * Only dimensions with at least one answered question are included.
 *
 * Per dimension with 5 questions:
 *   min raw sum = 5 (all 1s effective), max = 25 (all 5s effective)
 *   normalized = (rawSum - 5) / 20 * 100
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

    const minPossible = answered.length; // all 1s
    const maxPossible = answered.length * 5; // all 5s
    const range = maxPossible - minPossible;

    const normalizedScore =
      range > 0 ? Math.round(((rawSum - minPossible) / range) * 100) : 50;

    return { dimensionId: dim.id, normalizedScore, rawSum };
  });
}
