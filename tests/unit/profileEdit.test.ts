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
  it("returns a trimmed patch for valid input", () => {
    const { patch, error } = sanitizeProfileEdit({
      level: "SS 2", school: "  Unity High  ", phone: " 08012345678 ",
      dob: "2009-05-01", address: "Lagos", guardian_name: "Ada", guardian_contact: "0803",
    });
    expect(error).toBeUndefined();
    expect(patch).toEqual({
      level: "SS 2", school: "Unity High", phone: "08012345678",
      dob: "2009-05-01", address: "Lagos", guardian_name: "Ada", guardian_contact: "0803",
    });
  });

  it("normalises a blank date of birth to null", () => {
    expect(sanitizeProfileEdit({ level: "", dob: "" }).patch?.dob).toBeNull();
  });

  it("rejects an invalid level", () => {
    const { patch, error } = sanitizeProfileEdit({ level: "Year 12" });
    expect(patch).toBeNull();
    expect(error).toMatch(/class/i);
  });

  it("rejects a malformed date of birth", () => {
    const { patch, error } = sanitizeProfileEdit({ level: "SS 1", dob: "01/05/2009" });
    expect(patch).toBeNull();
    expect(error).toMatch(/date/i);
  });

  it("clamps overly long free-text fields", () => {
    const { patch } = sanitizeProfileEdit({ level: "", address: "x".repeat(500) });
    expect(patch!.address.length).toBe(200);
  });
});
