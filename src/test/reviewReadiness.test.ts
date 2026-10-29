import { describe, expect, it } from "vitest";
import { managerFeedbackReady } from "@/lib/reviewReadiness";
import { blendRating, managerValuesAverage } from "@/lib/coreValues";
import { assessmentDimensions } from "@/lib/assessmentRole";
import { getDimensionsForRole } from "@/data/roles";
const rows = ["D", "P", "I", "N", "C"].map(value_code => ({ value_code, manager_score: 5 }));
describe("review safeguards", () => {
  it("requires all five DP INC manager scores", () => {
    expect(managerFeedbackReady("Genuine feedback", rows.slice(0, 4))).toBe(false);
    expect(managerFeedbackReady("Genuine feedback", rows)).toBe(true);
  });
  it("requires a nonblank manager narrative", () => {
    expect(managerFeedbackReady("   ", rows)).toBe(false);
  });
  it("blends 70% results and 30% values", () => {
    expect(blendRating(3, 5)).toEqual({ effective: 4, raw: 3.6, valuesAvg: 5 });
  });
  it("does not average incomplete values", () => {
    expect(managerValuesAverage(rows.slice(0, 4))).toBeNull();
  });
  it("excludes technical questions from a nontechnical leader override", () => {
    expect(assessmentDimensions([...getDimensionsForRole("team-leader-nontech"), "azure-cloud", "comptia-cyberops"], false))
      .toEqual(getDimensionsForRole("team-leader-nontech"));
  });
});