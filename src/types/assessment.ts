export type LikertValue = 1 | 2 | 3 | 4 | 5;

export interface Question {
  id: string;
  dimensionId: string;
  text: string;
  /** If true, response is reversed before scoring (1→5, 2→4, etc.) */
  reverseScored: boolean;
}

export interface Dimension {
  id: string;
  name: string;
  lowLabel: string;
  highLabel: string;
  description: string;
}

export interface AssessmentState {
  answers: Record<string, LikertValue>;
  currentQuestionIndex: number;
  isComplete: boolean;
}

export interface DimensionScore {
  dimensionId: string;
  /** 0–100 where 0 = fully lowLabel, 100 = fully highLabel */
  normalizedScore: number;
  rawSum: number;
}
