import { describe, it, expect } from "vitest";
import { parseStorageUrl, isPrivateBucket, fileHref } from "@/lib/storageUrls";

const PUBLIC_SUB = "https://xyz.supabase.co/storage/v1/object/public/submissions/sub-1/1700000000-ab12cd.png";
const PUBLIC_MAT = "https://xyz.supabase.co/storage/v1/object/public/materials/algebra/notes.pdf";
const SIGNED_VOICE = "https://xyz.supabase.co/storage/v1/object/sign/voice-notes/user-9/1700000000.webm?token=abc.def";

describe("parseStorageUrl", () => {
  it("reads bucket and path from a public URL", () => {
    expect(parseStorageUrl(PUBLIC_SUB)).toEqual({
      bucket: "submissions", path: "sub-1/1700000000-ab12cd.png",
    });
  });

  it("reads a signed URL too, dropping the token", () => {
    expect(parseStorageUrl(SIGNED_VOICE)).toEqual({
      bucket: "voice-notes", path: "user-9/1700000000.webm",
    });
  });

  it("decodes escaped path segments", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/submissions/sub%201/my%20photo.png";
    expect(parseStorageUrl(url)?.path).toBe("sub 1/my photo.png");
  });

  it("returns null for anything that isn't a storage object", () => {
    expect(parseStorageUrl("")).toBeNull();
    expect(parseStorageUrl("https://example.com/photo.png")).toBeNull();
    expect(parseStorageUrl("/api/files/download?u=x")).toBeNull();
  });
});

describe("isPrivateBucket", () => {
  it("covers exactly the buckets holding a learner's own work and private audio", () => {
    expect(isPrivateBucket("submissions")).toBe(true);
    expect(isPrivateBucket("voice-notes")).toBe(true);
    expect(isPrivateBucket("materials")).toBe(false);
    expect(isPrivateBucket("curricula")).toBe(false);
    expect(isPrivateBucket("assignments")).toBe(false);
  });
});

describe("fileHref", () => {
  it("routes a private object through the guarded download route", () => {
    expect(fileHref(PUBLIC_SUB)).toBe(`/api/files/download?u=${encodeURIComponent(PUBLIC_SUB)}`);
    expect(fileHref(SIGNED_VOICE)).toBe(`/api/files/download?u=${encodeURIComponent(SIGNED_VOICE)}`);
  });

  it("leaves public teaching content and external links alone", () => {
    expect(fileHref(PUBLIC_MAT)).toBe(PUBLIC_MAT);
    expect(fileHref("https://example.com/worksheet.pdf")).toBe("https://example.com/worksheet.pdf");
  });

  it("is safe on an empty or missing url", () => {
    expect(fileHref(null)).toBe("");
    expect(fileHref(undefined)).toBe("");
    expect(fileHref("")).toBe("");
  });
});
