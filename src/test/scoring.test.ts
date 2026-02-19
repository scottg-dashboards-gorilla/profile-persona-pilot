import { describe, it, expect } from "vitest";
import { calculateScores } from "@/lib/scoring";
import { LikertValue } from "@/types/assessment";

describe("calculateScores", () => {
  it("returns 50 for unanswered dimensions", () => {
    const scores = calculateScores({});
    scores.forEach((s) => expect(s.normalizedScore).toBe(50));
  });

  it("returns 0 when all answers push to the low end", () => {
    // emotional-awareness: reverse items (eo-2,5) answered 5 → effective 1; non-reverse (eo-1,3,4) answered 1
    const answers: Record<string, LikertValue> = {
      "eo-1": 1, "eo-2": 5, "eo-3": 1, "eo-4": 1, "eo-5": 5,
    };
    const scores = calculateScores(answers);
    const dim = scores.find((s) => s.dimensionId === "emotional-awareness")!;
    expect(dim.normalizedScore).toBe(0);
  });

  it("returns 100 when all answers push to the high end", () => {
    const answers: Record<string, LikertValue> = {
      "eo-1": 5, "eo-2": 1, "eo-3": 5, "eo-4": 5, "eo-5": 1,
    };
    const scores = calculateScores(answers);
    const dim = scores.find((s) => s.dimensionId === "emotional-awareness")!;
    expect(dim.normalizedScore).toBe(100);
  });

  it("returns 50 for all neutral answers", () => {
    const answers: Record<string, LikertValue> = {
      "eo-1": 3, "eo-2": 3, "eo-3": 3, "eo-4": 3, "eo-5": 3,
    };
    const scores = calculateScores(answers);
    const dim = scores.find((s) => s.dimensionId === "emotional-awareness")!;
    expect(dim.normalizedScore).toBe(50);
  });
});
