import { describe, it, expect } from "vitest";
import { calculateScores } from "@/lib/scoring";
import { LikertValue } from "@/types/assessment";

describe("calculateScores", () => {
  it("returns 50 for unanswered dimensions", () => {
    const scores = calculateScores({});
    scores.forEach((s) => expect(s.normalizedScore).toBe(50));
  });

  it("returns 0 when all answers push to the low end", () => {
    // leadership-example: reverse items (le-3,5) answered 5 → effective 1; non-reverse (le-1,2,4) answered 1
    const answers: Record<string, LikertValue> = {
      "le-1": 1, "le-2": 1, "le-3": 5, "le-4": 1, "le-5": 5,
    };
    const scores = calculateScores(answers);
    const dim = scores.find((s) => s.dimensionId === "leadership-example")!;
    expect(dim.normalizedScore).toBe(0);
  });

  it("returns 100 when all answers push to the high end", () => {
    const answers: Record<string, LikertValue> = {
      "le-1": 5, "le-2": 5, "le-3": 1, "le-4": 5, "le-5": 1,
    };
    const scores = calculateScores(answers);
    const dim = scores.find((s) => s.dimensionId === "leadership-example")!;
    expect(dim.normalizedScore).toBe(100);
  });

  it("returns 50 for all neutral answers", () => {
    const answers: Record<string, LikertValue> = {
      "le-1": 3, "le-2": 3, "le-3": 3, "le-4": 3, "le-5": 3,
    };
    const scores = calculateScores(answers);
    const dim = scores.find((s) => s.dimensionId === "leadership-example")!;
    expect(dim.normalizedScore).toBe(50);
  });
});
