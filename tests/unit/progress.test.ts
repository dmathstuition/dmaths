import { describe, it, expect } from "vitest";
import { subjectAverages } from "@/lib/progress";

const sub = (status: string, grade: number | null, subject?: string) =>
  ({ status, grade, assignment: subject ? { subject } : null });

describe("subjectAverages", () => {
  it("averages graded submissions per subject, highest first", () => {
    const rows = [
      sub("graded", 80, "Mathematics"),
      sub("graded", 90, "Mathematics"),
      sub("graded", 72, "Physics"),
      sub("pending", null, "Mathematics"), // ignored (not graded)
      sub("graded", null, "Chemistry"),    // ignored (no grade)
    ];
    expect(subjectAverages(rows)).toEqual([
      { subject: "Mathematics", pct: 85, count: 2 },
      { subject: "Physics", pct: 72, count: 1 },
    ]);
  });

  it("buckets submissions with no subject under 'Other'", () => {
    expect(subjectAverages([sub("graded", 50)])).toEqual([{ subject: "Other", pct: 50, count: 1 }]);
  });

  it("is empty when nothing is graded", () => {
    expect(subjectAverages([sub("pending", null, "Maths")])).toEqual([]);
    expect(subjectAverages([])).toEqual([]);
  });
});
