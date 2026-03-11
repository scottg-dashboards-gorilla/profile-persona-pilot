export type LikertValue = 1 | 2 | 3 | 4 | 5;

export interface Question {
  id: string;
  dimensionId: string;
  text: string;
  /** If true, response is reversed before scoring (1→5, 2→4, etc.) */
  reverseScored: boolean;
  /** ID of a paired question used for truthfulness/consistency checking */
  consistencyPairId?: string;
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

export type DISCType = "D" | "I" | "S" | "C";

export interface DISCProfile {
  D: number;
  I: number;
  S: number;
  C: number;
  primaryType: DISCType;
  secondaryType: DISCType;
}

export interface TruthtfulnessResult {
  score: number; // 0-100, higher = more consistent. -1 = not available
  pairCount: number;
  inconsistentPairs: { q1Id: string; q2Id: string; delta: number }[];
  label: string; // "High", "Moderate", "Low", "N/A"
}

export type TierLevel = "tier-1" | "tier-2" | "team-leader";

export interface TierClassification {
  tier: TierLevel;
  label: string;
  confidence: number; // 0-100
  reasoning: string;
}
