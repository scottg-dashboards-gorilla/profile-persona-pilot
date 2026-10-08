import { describe, expect, it } from "vitest";
import { assessmentRoleFor, departmentValues, questionApplies, reviewGroup } from "@/lib/departmentReview";

describe("department review scopes", () => {
  const leader = { department: "Service Delivery", title: "Service Team Lead" };
  const technician = { department: "Service Delivery", title: "Service Technician I" };
  it("separates operations leaders from technicians", () => {
    expect(reviewGroup(leader)).toBe("operations-leaders");
    expect(reviewGroup(technician)).toBe("service-technicians");
    expect(assessmentRoleFor(leader)).toBe("operations-oversight");
    expect(assessmentRoleFor(technician)).toBe("service-delivery-technical");
  });
  it("matches exact job titles case-insensitively without leaking scopes", () => {
    const question = { department: "Service Delivery", applies_to_titles: ["service team lead"] };
    expect(questionApplies(question, leader)).toBe(true);
    expect(questionApplies(question, technician)).toBe(false);
    expect(questionApplies(question, { department: "Engineering & Security", title: leader.title })).toBe(false);
    expect(questionApplies(question, { department: "Service Delivery", title: null })).toBe(false);
  });
  it("preserves company-wide and unscoped department questions", () => {
    expect(questionApplies({ department: null }, technician)).toBe(true);
    expect(questionApplies({ department: "Service Delivery", applies_to_titles: [] }, technician)).toBe(true);
  });
  it("keeps marketing questions away from sales roles", () => {
    const question = { department: "Sales & Marketing", applies_to_titles: ["Marketing Specialist"] };
    expect(questionApplies(question, { department: "Sales & Marketing", title: "Director of Strategic Partnerships" })).toBe(false);
    expect(questionApplies(question, { department: "Sales & Marketing", title: "Marketing Specialist" })).toBe(true);
  });
  it("keeps five values with one evidence prompt, never template scores", () => {
    const values = departmentValues(technician);
    expect(values).toHaveLength(5);
    expect(values.every((value) => value.prompt === "One example that justifies this score…")).toBe(true);
    expect(values.find((value) => value.code === "N")?.meaning).toContain("not personality");
  });
});