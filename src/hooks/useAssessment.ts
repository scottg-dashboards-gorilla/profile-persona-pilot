// ============= Full file contents =============

import { useState, useCallback, useMemo, useEffect } from "react";
import { AssessmentState, LikertValue, DimensionScore, DISCProfile, TruthtfulnessResult } from "@/types/assessment";
import { Question } from "@/types/assessment";
import { generateQuestionOrder } from "@/lib/questionOrder";
import { calculateScores, calculateDISCProfile, calculateTruthfulness } from "@/lib/scoring";
import { DEFAULT_ROLE, getDimensionsForRole } from "@/data/roles";

const STORAGE_PREFIX = "datapath-assessment-progress:";
const LEGACY_STORAGE_KEY = "datapath-assessment-progress";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SavedProgress {
  answers: Record<string, LikertValue>;
  currentQuestionIndex: number;
  employeeName: string;
  startTime: number;
  savedAt: number;
  role?: string;
  /** Persisted dimension whitelist so custom (DB-defined) roles restore correctly. */
  roleDimensions?: string[];
}

/** One draft slot per candidate name so multiple people can share a device. */
const draftKey = (name: string) => STORAGE_PREFIX + name.trim().toLowerCase();

function parseDraft(raw: string | null): SavedProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedProgress;
    if (!parsed.answers || Object.keys(parsed.answers).length === 0) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!parsed.employeeName) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Move the old single-slot draft (pre per-person storage) into the person's own slot. */
function migrateLegacyDraft() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const parsed = parseDraft(raw);
    if (parsed?.employeeName) {
      localStorage.setItem(draftKey(parsed.employeeName), JSON.stringify(parsed));
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getSavedProgressFor(name: string): SavedProgress | null {
  if (!name.trim()) return null;
  try {
    return parseDraft(localStorage.getItem(draftKey(name)));
  } catch {
    return null;
  }
}

export function getAllSavedProgress(): SavedProgress[] {
  migrateLegacyDraft();
  const drafts: SavedProgress[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const parsed = parseDraft(localStorage.getItem(key));
      if (parsed) drafts.push(parsed);
    }
  } catch {
    /* ignore */
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}

export function clearSavedProgress(name?: string) {
  try {
    if (name && name.trim()) {
      localStorage.removeItem(draftKey(name));
    } else {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

const initialState: AssessmentState = {
  answers: {},
  currentQuestionIndex: 0,
  isComplete: false,
};

export function useAssessment() {
  const [state, setState] = useState<AssessmentState>(initialState);
  const [role, setRoleState] = useState<string>(DEFAULT_ROLE);
  const [roleDimensions, setRoleDimensions] = useState<string[]>(() => getDimensionsForRole(DEFAULT_ROLE));
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>(() =>
    generateQuestionOrder(getDimensionsForRole(DEFAULT_ROLE))
  );
  const [employeeName, setEmployeeName] = useState("");
  const [startTime, setStartTime] = useState(0);

  const setRole = useCallback((nextRoleId: string, nextDimensions?: string[]) => {
    const dims = nextDimensions ?? getDimensionsForRole(nextRoleId);
    setRoleState(nextRoleId);
    setRoleDimensions(dims);
    setOrderedQuestions(generateQuestionOrder(dims));
  }, []);

  useEffect(() => {
    if (Object.keys(state.answers).length > 0 && !state.isComplete && employeeName) {
      const progress: SavedProgress = {
        answers: state.answers,
        currentQuestionIndex: state.currentQuestionIndex,
        employeeName,
        startTime,
        savedAt: Date.now(),
        role,
        roleDimensions,
      };
      try {
        localStorage.setItem(draftKey(employeeName), JSON.stringify(progress));
      } catch {
        /* ignore */
      }
    }
  }, [state.answers, state.currentQuestionIndex, state.isComplete, employeeName, startTime, role, roleDimensions]);

  const restoreProgress = useCallback((saved: SavedProgress) => {
    const restoredRole = saved.role ?? DEFAULT_ROLE;
    const dims = saved.roleDimensions ?? getDimensionsForRole(restoredRole);
    setRoleState(restoredRole);
    setRoleDimensions(dims);
    setOrderedQuestions(generateQuestionOrder(dims));
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
    clearSavedProgress(employeeName);
  }, [employeeName]);

  const reset = useCallback(() => {
    clearSavedProgress(employeeName);
    setState(initialState);
    setEmployeeName("");
    setStartTime(0);
    setRoleState(DEFAULT_ROLE);
    setRoleDimensions(getDimensionsForRole(DEFAULT_ROLE));
    setOrderedQuestions(generateQuestionOrder(getDimensionsForRole(DEFAULT_ROLE)));
  }, [employeeName]);

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
    role,
    setRole,
    setEmployeeName,
    setStartTime,
    setAnswer,
    goToQuestion,
    completeAssessment,
    reset,
    restoreProgress,
  };
}
