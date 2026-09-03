import { describe, it, expect } from "vitest";
import { PACKAGES, findPackage, isPackageId, packageSubjects, packageRate, packageLabel } from "@/lib/packages";

describe("enrolment packages", () => {
  it("has the three tiers with distinct ids and a rate", () => {
    expect(PACKAGES.map(p => p.id)).toEqual(["tier1", "tier2", "tier3"]);
    for (const p of PACKAGES) expect(packageRate(p)).toBeGreaterThan(0);
  });

  it("maps each tier to its published hourly rate", () => {
    expect(packageRate(findPackage("tier1")!)).toBe(18000); // standard
    expect(packageRate(findPackage("tier2")!)).toBe(20000); // ks2
    expect(packageRate(findPackage("tier3")!)).toBe(25000); // coding
  });

  it("Tier 1 & 3 use fixed subjects", () => {
    expect(packageSubjects(findPackage("tier1")!)).toEqual(["Maths", "English", "Science"]);
    expect(packageSubjects(findPackage("tier3")!)).toContain("Coding");
  });

  it("Tier 2 takes up to 3 chosen subjects from its pool", () => {
    const t2 = findPackage("tier2")!;
    expect(packageSubjects(t2, ["Maths", "English", "Science", "Verbal Reasoning"])).toHaveLength(3);
    expect(packageSubjects(t2, ["Maths", "History"])).toEqual(["Maths"]); // out-of-pool dropped
  });

  it("validates and labels ids", () => {
    expect(isPackageId("tier2")).toBe(true);
    expect(isPackageId("tierX")).toBe(false);
    expect(packageLabel("tier1")).toMatch(/Tier 1/);
    expect(packageLabel(null)).toBe("");
  });
});
