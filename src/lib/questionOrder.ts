import { Question } from "@/types/assessment";
import { questions as allQuestions } from "@/data/questions";
import { dimensions } from "@/data/dimensions";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate round-robin question order:
 * For each round, pick one question per dimension (order shuffled).
 * Consistency-pair questions are spread throughout but separated from their originals.
 */
export function generateQuestionOrder(allowedDimensionIds?: string[]): Question[] {
  const allowed = allowedDimensionIds ? new Set(allowedDimensionIds) : null;
  const pool = allowed
    ? allQuestions.filter((q) => allowed.has(q.dimensionId))
    : allQuestions;

  const poolIds = new Set(pool.map((q) => q.id));
  const dimIds = dimensions.map((d) => d.id).filter((id) => !allowed || allowed.has(id));

  // Separate regular questions from truthfulness pairs.
  // Only keep a truthfulness pair if both halves survived the filter.
  const regularQuestions = pool.filter((q) => !q.consistencyPairId);
  const truthfulnessQuestions = pool.filter(
    (q) => q.consistencyPairId && poolIds.has(q.consistencyPairId)
  );

  // Group regular questions by dimension
  const questionsByDim = new Map<string, Question[]>();
  for (const d of dimIds) {
    questionsByDim.set(d, regularQuestions.filter((q) => q.dimensionId === d));
  }

  // Find max questions per dimension for regular questions
  const maxRounds = Math.max(...Array.from(questionsByDim.values()).map(qs => qs.length));

  const ordered: Question[] = [];

  // Round-robin the regular questions
  for (let round = 0; round < maxRounds; round++) {
    const shuffledDims = shuffle(dimIds);
    for (const dimId of shuffledDims) {
      const dimQuestions = questionsByDim.get(dimId)!;
      if (round < dimQuestions.length) {
        ordered.push(dimQuestions[round]);
      }
    }
  }

  // Insert truthfulness questions spread throughout the second half
  // This ensures originals are answered first before their rephrased pairs appear
  const shuffledTP = shuffle(truthfulnessQuestions);
  const insertStart = Math.floor(ordered.length * 0.5);
  const spacing = Math.floor((ordered.length - insertStart) / shuffledTP.length);

  for (let i = 0; i < shuffledTP.length; i++) {
    const insertIndex = Math.min(insertStart + (i * spacing) + i, ordered.length);
    ordered.splice(insertIndex, 0, shuffledTP[i]);
  }

  return ordered;
}
