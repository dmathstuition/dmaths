import { describe, it, expect } from "vitest";
import { sanitizeProfileEdit, isValidLevel, EDITABLE_LEVELS } from "@/lib/profileEdit";

describe("isValidLevel", () => {
  it("accepts a known level or blank, rejects anything else", () => {
    expect(isValidLevel("SS 3")).toBe(true);
    expect(isValidLevel("")).toBe(true);
    expect(isValidLevel("University")).toBe(false);
    expect(isValidLevel("ss3")).toBe(false);
  });
  it("covers primary through SS3", () => {
    expect(EDITABLE_LEVELS).toContain("Primary");
    expect(EDITABLE_LEVELS).toContain("SS 3");
  });
});

describe("sanitizeProfileEdit", () => {
  const base = { level: "SS 2", subjects: ["Maths", "Physics"] };

  it("returns a trimmed patch for valid input", () => {
    const { patch, error } = sanitizeProfileEdit({
      ...base, school: "  Unity High  ", phone: " 08012345678 ",
      dob: "2009-05-01", address: "Lagos", guardian_name: "Ada", guardian_contact: "0803",
    });
    expect(error).toBeUndefined();
    expect(patch).toEqual({
      level: "SS 2", subjects: ["Maths", "Physics"], school: "Unity High", phone: "08012345678",
      dob: "2009-05-01", address: "Lagos", guardian_name: "Ada", guardian_contact: "0803",
    });
  });

  it("maps legacy subjects onto the academy set, de-duplicated", () => {
    const { patch } = sanitizeProfileEdit({ ...base, subjects: ["Maths", "Algebra", "Calculus", "A.I and Automation"] });
    expect(patch!.subjects).toEqual(["Maths", "A.I and Automation"]); // Algebra + Calculus → Maths
  });

  it("rejects when nothing maps to an academy subject", () => {
    const { patch, error } = sanitizeProfileEdit({ level: "SS 2", subjects: ["External Examinations"] });
    expect(patch).toBeNull();
    expect(error).toMatch(/subject/i);
  });

  it("normalises a blank date of birth to null", () => {
    expect(sanitizeProfileEdit({ ...base, dob: "" }).patch?.dob).toBeNull();
  });

  it("rejects an invalid level", () => {
    const { patch, error } = sanitizeProfileEdit({ level: "Year 12", subjects: ["Maths"] });
    expect(patch).toBeNull();
    expect(error).toMatch(/class/i);
  });

  it("rejects a malformed date of birth", () => {
    const { patch, error } = sanitizeProfileEdit({ ...base, dob: "01/05/2009" });
    expect(patch).toBeNull();
    expect(error).toMatch(/date/i);
  });

  it("clamps overly long free-text fields", () => {
    const { patch } = sanitizeProfileEdit({ ...base, address: "x".repeat(500) });
    expect(patch!.address.length).toBe(200);
  });
});
