import { describe, it, expect } from "vitest";
import { resolveAttachmentPath, ATTACHMENTS_ROOT } from "./attachmentsRouter";

/**
 * Security regression tests for the file-attachment router. The critical
 * property under test is that a hostile `storageKey` — passed in from the
 * DB row, but potentially crafted by an attacker via a schema-bypass or a
 * migration bug — cannot escape the per-user directory under
 * ATTACHMENTS_ROOT.
 */
describe("resolveAttachmentPath", () => {
  it("resolves a clean storageKey inside the user directory", () => {
    const p = resolveAttachmentPath(42, "abc123.pdf");
    expect(p.startsWith(ATTACHMENTS_ROOT)).toBe(true);
    expect(p.endsWith("/42/abc123.pdf")).toBe(true);
  });

  it("throws when storageKey uses '..' to climb out", () => {
    expect(() => resolveAttachmentPath(42, "../43/other.pdf")).toThrow(/invalid storage key/i);
  });

  it("throws when storageKey has an absolute path", () => {
    // path.resolve() with an absolute segment discards the userDir prefix
    expect(() => resolveAttachmentPath(42, "/etc/passwd")).toThrow(/invalid storage key/i);
  });

  it("throws when storageKey has a nested traversal", () => {
    expect(() => resolveAttachmentPath(42, "sub/../../../etc/hosts")).toThrow(/invalid storage key/i);
  });

  it("keeps different users isolated even with same storageKey", () => {
    const a = resolveAttachmentPath(1, "same.pdf");
    const b = resolveAttachmentPath(2, "same.pdf");
    expect(a).not.toBe(b);
    expect(a.includes("/1/")).toBe(true);
    expect(b.includes("/2/")).toBe(true);
  });
});
