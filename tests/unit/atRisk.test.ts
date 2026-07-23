import { describe, it, expect } from "vitest";
import { assessRisk } from "@/lib/atRisk";

describe("assessRisk", () => {
  it("flags nothing for a healthy learner", () => {
    const r = assessRisk({ avgScore: 82, attendance: 95, overdue: 0, sanctionPoints: 0 });
    expect(r.level).toBe("none");
    expect(r.reasons).toHaveLength(0);
  });

  it("does not flag a brand-new learner with no history (0/0)", () => {
    const r = assessRisk({ avgScore: 0, attendance: 0, overdue: 0, sanctionPoints: 0 });
    expect(r.level).toBe("none");
  });

  it("flags high risk for very low score + poor attendance", () => {
    const r = assessRisk({ avgScore: 35, attendance: 55, overdue: 0, sanctionPoints: 0 });
    expect(r.level).toBe("high");
    expect(r.reasons.some((x) => /average/i.test(x))).toBe(true);
    expect(r.reasons.some((x) => /attendance/i.test(x))).toBe(true);
  });

  it("flags low risk for a single overdue assignment", () => {
    const r = assessRisk({ avgScore: 70, attendance: 90, overdue: 1, sanctionPoints: 0 });
    expect(r.level).toBe("low");
    expect(r.reasons).toEqual(["1 overdue assignment"]);
  });

  it("escalates with many overdue assignments", () => {
    const r = assessRisk({ avgScore: 70, attendance: 90, overdue: 4, sanctionPoints: 0 });
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.reasons[0]).toBe("4 overdue assignments");
  });

  it("counts behaviour sanctions (absolute)", () => {
    const r = assessRisk({ avgScore: 80, attendance: 90, overdue: 0, sanctionPoints: -8 });
    expect(r.reasons.some((x) => /sanction/i.test(x))).toBe(true);
  });
});
