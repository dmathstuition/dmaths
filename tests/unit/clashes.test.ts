import { describe, it, expect } from "vitest";
import { overlaps, findClashes, searchWindow, type ExistingClass } from "@/lib/clashes";

const at = (hhmm: string, mins = 60) => ({ startsAt: `2026-04-07T${hhmm}:00.000Z`, durationMinutes: mins });

describe("overlaps", () => {
  it("catches a straight double booking", () => {
    expect(overlaps(at("16:00"), at("16:00"))).toBe(true);
    expect(overlaps(at("16:00"), at("16:30"))).toBe(true);
    expect(overlaps(at("16:30"), at("16:00"))).toBe(true);
  });

  // Half-open windows: 4–5 followed by 5–6 is back-to-back, not a conflict.
  it("allows back-to-back classes that merely touch", () => {
    expect(overlaps(at("16:00"), at("17:00"))).toBe(false);
    expect(overlaps(at("17:00"), at("16:00"))).toBe(false);
  });

  it("catches one class wholly inside another", () => {
    expect(overlaps(at("16:00", 180), at("17:00", 30))).toBe(true);
    expect(overlaps(at("17:00", 30), at("16:00", 180))).toBe(true);
  });

  it("leaves separate times alone", () => {
    expect(overlaps(at("09:00"), at("16:00"))).toBe(false);
  });

  it("treats an unparseable time as no clash rather than guessing", () => {
    expect(overlaps({ startsAt: "not a date", durationMinutes: 60 }, at("16:00"))).toBe(false);
  });
});

describe("findClashes", () => {
  const existing: ExistingClass[] = [
    { id: "c1", subject: "Algebra", startsAt: "2026-04-07T16:00:00.000Z", durationMinutes: 60, tutorId: "t1", studentIds: ["s1", "s2"] },
    { id: "c2", subject: "English", startsAt: "2026-04-07T18:00:00.000Z", durationMinutes: 60, tutorId: "t2", studentIds: ["s3"] },
  ];

  it("flags the same tutor teaching elsewhere", () => {
    const found = findClashes({ ...at("16:30"), tutorId: "t1", studentIds: [] }, existing);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: "tutor", classId: "c1", subject: "Algebra" });
  });

  it("flags learners already booked, naming only the ones affected", () => {
    const found = findClashes({ ...at("16:30"), tutorId: "t9", studentIds: ["s2", "s3"] }, existing);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("learners");
    expect(found[0].studentIds).toEqual(["s2"]); // s3 is free at 16:30
  });

  it("reports both when the tutor and the learners collide", () => {
    const found = findClashes({ ...at("16:00"), tutorId: "t1", studentIds: ["s1"] }, existing);
    expect(found.map((c) => c.kind).sort()).toEqual(["learners", "tutor"]);
  });

  // Editing a class must not find the class being edited.
  it("ignores the class being edited", () => {
    const candidate = { ...at("16:00"), tutorId: "t1", studentIds: ["s1"] };
    expect(findClashes(candidate, existing, ["c1"])).toEqual([]);
  });

  it("says nothing when the time is free", () => {
    expect(findClashes({ ...at("09:00"), tutorId: "t1", studentIds: ["s1"] }, existing)).toEqual([]);
  });

  it("doesn't flag a different tutor with different learners", () => {
    expect(findClashes({ ...at("16:00"), tutorId: "t5", studentIds: ["s9"] }, existing)).toEqual([]);
  });
});

describe("searchWindow", () => {
  it("spans every occurrence of a series, padded for long classes", () => {
    const slots = [at("16:00"), { startsAt: "2026-04-14T16:00:00.000Z", durationMinutes: 60 }];
    const w = searchWindow(slots)!;
    expect(new Date(w.from).getTime()).toBeLessThan(new Date("2026-04-07T16:00:00.000Z").getTime());
    expect(new Date(w.to).getTime()).toBeGreaterThan(new Date("2026-04-14T17:00:00.000Z").getTime());
  });

  it("is null when there is nothing to check", () => {
    expect(searchWindow([])).toBeNull();
  });
});
