import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockServer,
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mockAdmin,
}));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn().mockReturnValue(true),
  clientKey: vi.fn().mockReturnValue("upload:1.2.3.4"),
}));

import { POST } from "@/app/api/upload/route";
import { rateLimit } from "@/lib/ratelimit";

const MB = 1024 * 1024;

function makeFormData(overrides: { fileName?: string; bucket?: string; size?: number; folder?: string } = {}) {
  const { fileName = "test.pdf", bucket = "materials", size = 1 * MB, folder = "" } = overrides;
  const file = new File([new Uint8Array(size)], fileName, { type: "application/pdf" });
  const fd = new FormData();
  fd.set("file", file);
  fd.set("bucket", bucket);
  if (folder) fd.set("folder", folder);
  return fd;
}

function makeRequest(formData: FormData) {
  return new Request("https://dmaths.test/api/upload", {
    method: "POST",
    headers: { "x-real-ip": "1.2.3.4" },
    body: formData,
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  vi.mocked(rateLimit).mockReturnValue(true);
});

describe("POST /api/upload", () => {
  it("allows an admin to upload a PDF to the materials bucket", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const res = await POST(makeRequest(makeFormData()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("url");
    expect(json).toHaveProperty("path");
  });

  it("allows a student to upload to the submissions bucket", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });

    const res = await POST(makeRequest(makeFormData({ bucket: "submissions" })));
    expect(res.status).toBe(200);
  });

  it("blocks a student from uploading to the materials bucket", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });

    const res = await POST(makeRequest(makeFormData({ bucket: "materials" })));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Forbidden");
  });

  it("returns 413 when the file exceeds 10 MB", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });

    const res = await POST(makeRequest(makeFormData({ size: 10 * MB + 1 })));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toMatch(/10 MB/);
  });

  it("allows a file that is exactly 10 MB", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const res = await POST(makeRequest(makeFormData({ size: 10 * MB })));
    expect(res.status).toBe(200);
  });

  it("returns 415 for a disallowed .exe extension", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });

    const fd = new FormData();
    fd.set("file", new File(["x"], "virus.exe"), "virus.exe");
    fd.set("bucket", "materials");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/\.exe/i);
  });

  it("returns 415 for a disallowed .php extension", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });

    const fd = new FormData();
    fd.set("file", new File(["<?php"], "shell.php"), "shell.php");
    fd.set("bucket", "materials");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it("accepts uppercase extensions like .JPG by lowercasing", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const fd = new FormData();
    fd.set("file", new File(["img"], "PHOTO.JPG", { type: "image/jpeg" }), "PHOTO.JPG");
    fd.set("bucket", "materials");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("returns 400 for an unrecognised bucket name", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });

    const res = await POST(makeRequest(makeFormData({ bucket: "hacker" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid bucket");
  });

  it("strips path traversal characters from the folder", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    await POST(makeRequest(makeFormData({ folder: "../../etc/passwd" })));

    const uploadCall = mockAdmin._storage.upload.mock.calls[0];
    const uploadedPath: string = uploadCall?.[0] ?? "";
    expect(uploadedPath).not.toContain("..");
  });

  it("caps the sanitized folder path at 60 characters", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const longFolder = "a".repeat(100);
    await POST(makeRequest(makeFormData({ folder: longFolder })));

    const uploadCall = mockAdmin._storage.upload.mock.calls[0];
    const uploadedPath: string = uploadCall?.[0] ?? "";
    // The folder portion before the timestamp is capped at 60 chars
    const folderPart = uploadedPath.split("/").slice(0, -1).join("/");
    expect(folderPart.length).toBeLessThanOrEqual(60);
  });

  it("returns 400 when no file is provided", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });

    const fd = new FormData();
    fd.set("bucket", "materials");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(rateLimit).mockReturnValue(false);

    const res = await POST(makeRequest(makeFormData()));
    expect(res.status).toBe(429);
  });
});
