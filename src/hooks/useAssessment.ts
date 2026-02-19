import { useState, useCallback, useMemo } from "react";
import { AssessmentState, LikertValue, DimensionScore } from "@/types/assessment";
import { Question } from "@/types/assessment";
import { generateQuestionOrder } from "@/lib/questionOrder";
import { calculateScores } from "@/lib/scoring";

const initialState: AssessmentState = {
  answers: {},
  currentQuestionIndex: 0,
  isComplete: false,
};

export function useAssessment() {
  const [state, setState] = useState<AssessmentState>(initialState);
  const [orderedQuestions] = useState<Question[]>(() => generateQuestionOrder());

  const setAnswer = useCallback((questionId: string, value: LikertValue) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
    }));
  }, []);

  const goToQuestion = useCallback(
    (index: number) => {
      setState((prev) => ({
        ...prev,
        currentQuestionIndex: Math.max(0, Math.min(index, orderedQuestions.length - 1)),
      }));
    },
    [orderedQuestions.length]
  );

  const completeAssessment = useCallback(() => {
    setState((prev) => ({ ...prev, isComplete: true }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const scores: DimensionScore[] = useMemo(
    () => calculateScores(state.answers),
    [state.answers]
  );

  const currentQuestion = orderedQuestions[state.currentQuestionIndex] ?? null;
  const progress = Object.keys(state.answers).length / orderedQuestions.length;
  const totalQuestions = orderedQuestions.length;

  return {
    state,
    currentQuestion,
    questions: orderedQuestions,
    totalQuestions,
    progress,
    scores,
    setAnswer,
    goToQuestion,
    completeAssessment,
    reset,
  };
}
