import { describe, it, expect } from "vitest";
import { isFormalNote } from "@/lib/performanceNotes";

describe("performance notes visibility", () => {
  it("hides verbal warnings and observations from the employee", () => {
    expect(isFormalNote("verbal_warning")).toBe(false);
    expect(isFormalNote("observation")).toBe(false);
  });
  it("shows formal warnings to the employee for sign-off", () => {
    expect(isFormalNote("written_warning")).toBe(true);
    expect(isFormalNote("final_warning")).toBe(true);
    expect(isFormalNote("pip_referral")).toBe(true);
  });
});
