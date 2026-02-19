import { Question } from "@/types/assessment";
import { questions } from "@/data/questions";
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
 * 5 rounds, each round has 1 question per dimension (8 questions),
 * dimension order shuffled within each round.
 */
export function generateQuestionOrder(): Question[] {
  const dimIds = dimensions.map((d) => d.id);
  const questionsByDim = new Map<string, Question[]>();
  for (const d of dimIds) {
    questionsByDim.set(d, questions.filter((q) => q.dimensionId === d));
  }

  const ordered: Question[] = [];
  for (let round = 0; round < 5; round++) {
    const shuffledDims = shuffle(dimIds);
    for (const dimId of shuffledDims) {
      const dimQuestions = questionsByDim.get(dimId)!;
      if (round < dimQuestions.length) {
        ordered.push(dimQuestions[round]);
      }
    }
  }

  return ordered;
}
