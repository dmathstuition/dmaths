import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";
import { lookupCredential } from "@/lib/verify";

let admin: ReturnType<typeof makeMockSupabaseClient>;

// The route reads three tables in order via maybeSingle: certificates, then
// report_cards, then profiles (for the name). Queue answers to match.
function answers(...seq: any[]) {
  let i = 0;
  admin._qb.maybeSingle.mockImplementation(async () => seq[i++] ?? { data: null, error: null });
}

beforeEach(() => { admin = makeMockSupabaseClient(); });

describe("lookupCredential", () => {
  it("verifies a certificate and returns only safe fields", async () => {
    answers(
      { data: { serial: "DM-2026-A1B2", title: "Certificate of Completion", subtitle: "Summer Camp", student_id: "stu-1", issued_at: "2026-06-12T00:00:00Z" }, error: null },
      { data: { first_name: "Ada", last_name: "Obi" }, error: null }, // the name lookup
    );
    const res = await lookupCredential(admin as any, "dm-2026-a1b2"); // lowercase in
    expect(res).toMatchObject({
      kind: "certificate",
      serial: "DM-2026-A1B2",
      name: "Ada Obi",
      title: "Certificate of Completion",
      subtitle: "Summer Camp",
    });
    // Nothing sensitive leaks through.
    expect(res).not.toHaveProperty("student_id");
    expect(JSON.stringify(res)).not.toMatch(/email|grade|score/i);
  });

  it("falls through to report cards when it isn't a certificate", async () => {
    answers(
      { data: null, error: null },                                             // not a certificate
      { data: { serial: "RC-2026-XYZ999", term: "First Term 2025/26", student_id: "stu-2", issued_at: "2026-01-10T00:00:00Z" }, error: null },
      { data: { first_name: "Ben", last_name: "Ade" }, error: null },
    );
    const res = await lookupCredential(admin as any, "RC-2026-XYZ999");
    expect(res).toMatchObject({ kind: "report-card", title: "Progress Report", subtitle: "First Term 2025/26", name: "Ben Ade" });
  });

  it("returns null for an unknown serial", async () => {
    answers({ data: null, error: null }, { data: null, error: null });
    expect(await lookupCredential(admin as any, "DM-2026-NOPE")).toBeNull();
  });

  it("returns null for an empty serial without hitting the database", async () => {
    expect(await lookupCredential(admin as any, "   ")).toBeNull();
    expect(admin._qb.maybeSingle).not.toHaveBeenCalled();
  });

  it("normalises the serial (trim + uppercase) before matching", async () => {
    answers({ data: { serial: "DM-2026-A1B2", title: "Cert", student_id: null, issued_at: "2026-06-12T00:00:00Z" }, error: null });
    await lookupCredential(admin as any, "  dm-2026-a1b2  ");
    expect(admin._qb.eq).toHaveBeenCalledWith("serial", "DM-2026-A1B2");
  });

  it("shows a placeholder name when the learner record is gone", async () => {
    answers({ data: { serial: "DM-2026-A1B2", title: "Cert", student_id: null, issued_at: "2026-06-12T00:00:00Z" }, error: null });
    const res = await lookupCredential(admin as any, "DM-2026-A1B2");
    expect(res?.name).toBe("A learner");
  });
});
