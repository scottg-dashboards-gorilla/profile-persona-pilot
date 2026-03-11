import { describe, it, expect } from "vitest";
import { calculateScores, calculateDISCProfile, calculateTruthfulness } from "@/lib/scoring";
import { LikertValue } from "@/types/assessment";

describe("calculateScores", () => {
  it("returns 50 for unanswered dimensions", () => {
    const scores = calculateScores({});
    const leadershipScore = scores.find(s => s.dimensionId === "leadership-example");
    expect(leadershipScore?.normalizedScore).toBe(50);
  });

  it("returns 0 when all answers push to the low end", () => {
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

describe("calculateDISCProfile", () => {
  it("identifies primary and secondary types", () => {
    const scores = calculateScores({
      "dd-1": 5, "dd-2": 5, "dd-3": 1, "dd-4": 5,
      "di-1": 3, "di-2": 3, "di-3": 3, "di-4": 3,
      "ds-1": 1, "ds-2": 1, "ds-3": 5, "ds-4": 1,
      "dc-1": 2, "dc-2": 2, "dc-3": 4, "dc-4": 2,
    });
    const disc = calculateDISCProfile(scores);
    expect(disc.primaryType).toBe("D");
    expect(disc.D).toBeGreaterThan(disc.S);
  });
});

describe("calculateTruthfulness", () => {
  it("returns 100 when no pairs are answered", () => {
    const result = calculateTruthfulness({});
    expect(result.score).toBe(100);
  });

  it("detects consistency when paired answers match", () => {
    // le-1 is non-reverse, tp-1 pairs with le-1 and is also non-reverse
    const answers: Record<string, LikertValue> = {
      "le-1": 5,
      "tp-1": 5,
    };
    const result = calculateTruthfulness(answers);
    expect(result.score).toBe(100);
    expect(result.inconsistentPairs).toHaveLength(0);
  });

  it("detects inconsistency when paired answers conflict", () => {
    // le-1 (non-reverse, answer 5 → effective 5), tp-1 (non-reverse, answer 1 → effective 1)
    const answers: Record<string, LikertValue> = {
      "le-1": 5,
      "tp-1": 1,
    };
    const result = calculateTruthfulness(answers);
    expect(result.score).toBeLessThan(50);
    expect(result.inconsistentPairs.length).toBeGreaterThan(0);
  });
});
