import { describe, it, expect } from "vitest";
import { assignmentColor, ASSIGNMENT_CARD_COLORS } from "@/lib/assignmentColors";

describe("assignmentColor", () => {
  it("is stable for the same subject", () => {
    expect(assignmentColor("Maths")).toBe(assignmentColor("Maths"));
  });
  it("always returns a colour from the palette", () => {
    for (const s of ["Maths", "Physics", "Python", "Web development", "", "Anything"]) {
      expect(ASSIGNMENT_CARD_COLORS).toContain(assignmentColor(s));
    }
  });
  it("spreads different subjects across the palette", () => {
    const subjects = ["Maths", "Furthermaths", "Physics", "Python", "Web development", "A.I and Automation"];
    const used = new Set(subjects.map((s) => assignmentColor(s).from));
    expect(used.size).toBeGreaterThan(1);
  });
});
