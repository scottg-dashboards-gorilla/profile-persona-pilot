import { useState, useCallback, useMemo, useEffect } from "react";
import { AssessmentState, LikertValue, DimensionScore, DISCProfile, TruthtfulnessResult } from "@/types/assessment";
import { Question } from "@/types/assessment";
import { generateQuestionOrder } from "@/lib/questionOrder";
import { calculateScores, calculateDISCProfile, calculateTruthfulness } from "@/lib/scoring";

const STORAGE_KEY = "datapath-assessment-progress";

interface SavedProgress {
  answers: Record<string, LikertValue>;
  currentQuestionIndex: number;
  employeeName: string;
  startTime: number;
  savedAt: number;
}

const initialState: AssessmentState = {
  answers: {},
  currentQuestionIndex: 0,
  isComplete: false,
};

export function getSavedProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed.answers && Object.keys(parsed.answers).length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSavedProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useAssessment() {
  const [state, setState] = useState<AssessmentState>(initialState);
  const [orderedQuestions] = useState<Question[]>(() => generateQuestionOrder());
  const [employeeName, setEmployeeName] = useState("");
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    if (Object.keys(state.answers).length > 0 && !state.isComplete && employeeName) {
      const progress: SavedProgress = {
        answers: state.answers,
        currentQuestionIndex: state.currentQuestionIndex,
        employeeName,
        startTime,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [state.answers, state.currentQuestionIndex, state.isComplete, employeeName, startTime]);

  const restoreProgress = useCallback((saved: SavedProgress) => {
    setState({
      answers: saved.answers,
      currentQuestionIndex: saved.currentQuestionIndex,
      isComplete: false,
    });
    setEmployeeName(saved.employeeName);
    setStartTime(saved.startTime);
  }, []);

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
    clearSavedProgress();
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setEmployeeName("");
    setStartTime(0);
    clearSavedProgress();
  }, []);

  const scores: DimensionScore[] = useMemo(
    () => calculateScores(state.answers),
    [state.answers]
  );

  const discProfile: DISCProfile = useMemo(
    () => calculateDISCProfile(scores),
    [scores]
  );

  const truthfulness: TruthtfulnessResult = useMemo(
    () => calculateTruthfulness(state.answers),
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
    discProfile,
    truthfulness,
    employeeName,
    startTime,
    setEmployeeName,
    setStartTime,
    setAnswer,
    goToQuestion,
    completeAssessment,
    reset,
    restoreProgress,
  };
}
