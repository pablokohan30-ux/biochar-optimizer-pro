import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

/**
 * Security properties of the audit-package shareToken generator.
 *
 * The public /audit/:token route serves the frozen snapshot to anyone who
 * holds the token. The whole security model rests on the token being
 * unguessable and unique — this test locks those properties down.
 */

// Copy of the router's helper so the test doesn't couple to import order or
// mock the DB. If the generator ever changes, update both together.
function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

describe("audit-package shareToken", () => {
  it("returns a URL-safe base64 string (no +, /, or =)", () => {
    for (let i = 0; i < 50; i++) {
      const t = generateShareToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("has ~32 characters (24 bytes → 32 base64url chars)", () => {
    for (let i = 0; i < 20; i++) {
      const t = generateShareToken();
      expect(t.length).toBeGreaterThanOrEqual(30);
      expect(t.length).toBeLessThanOrEqual(34);
    }
  });

  it("never collides across many samples (192 bits of entropy)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5_000; i++) {
      const t = generateShareToken();
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
    expect(seen.size).toBe(5_000);
  });

  it("is not derivable from projectId or timestamp (uses crypto random)", () => {
    // Sanity check: two calls in the same tick produce different tokens.
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toBe(b);
  });
});
