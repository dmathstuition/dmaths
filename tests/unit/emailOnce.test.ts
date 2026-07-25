import { describe, it, expect, vi } from "vitest";
import { claimEmailSend, emailLogReady } from "@/lib/emailOnce";

// A tiny stand-in for the parts of the client the guard touches.
function client(insertResult: { error: any }, selectResult: { error: any } = { error: null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  return {
    insert,
    client: {
      from: () => ({
        insert,
        select: () => ({ limit: () => Promise.resolve(selectResult) }),
      }),
    } as any,
  };
}

describe("claimEmailSend", () => {
  it("claims the day and says send", async () => {
    const { client: c, insert } = client({ error: null });
    await expect(claimEmailSend(c, "guardian_digest", "mum@example.com", "stu-1")).resolves.toBe("send");
    expect(insert).toHaveBeenCalledWith({ kind: "guardian_digest", recipient: "mum@example.com", ref: "stu-1" });
  });

  // This is the whole point: the second run of the day must not email again.
  it("says already when the unique index rejects the second claim", async () => {
    const { client: c } = client({ error: { code: "23505", message: "duplicate key" } });
    await expect(claimEmailSend(c, "guardian_digest", "mum@example.com", "stu-1")).resolves.toBe("already");
  });

  it("says unavailable when the table hasn't been created yet", async () => {
    const { client: c } = client({ error: { code: "42P01", message: 'relation "email_log" does not exist' } });
    await expect(claimEmailSend(c, "assignment_reminder", "ada@example.com")).resolves.toBe("unavailable");
  });

  // A logging hiccup must not silently swallow a reminder a family is waiting for.
  it("still sends when logging fails for some other reason", async () => {
    const { client: c } = client({ error: { code: "08006", message: "connection failure" } });
    await expect(claimEmailSend(c, "assignment_reminder", "ada@example.com")).resolves.toBe("send");
  });
});

describe("emailLogReady", () => {
  it("is true when the table answers", async () => {
    const { client: c } = client({ error: null }, { error: null });
    await expect(emailLogReady(c)).resolves.toBe(true);
  });

  it("is false when it doesn't exist", async () => {
    const { client: c } = client({ error: null }, { error: { code: "42P01" } });
    await expect(emailLogReady(c)).resolves.toBe(false);
  });
});
