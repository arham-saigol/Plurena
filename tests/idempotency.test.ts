import { describe, expect, it } from "vitest";
import { resolveIdempotent, stableFingerprint } from "@/convex/lib/idempotency";

describe("launch idempotency", () => {
  it("returns the prior result for the same key and immutable input", () => {
    const fingerprint = stableFingerprint({ title: "Question", panelSize: 20 });
    expect(resolveIdempotent({ key: "request-1", fingerprint, value: "test-1" }, "request-1", fingerprint)).toBe("test-1");
  });
  it("rejects a key reused with different input", () => {
    const existing = { key: "request-1", fingerprint: stableFingerprint({ panelSize: 20 }), value: "test-1" };
    expect(() => resolveIdempotent(existing, "request-1", stableFingerprint({ panelSize: 50 }))).toThrow("IDEMPOTENCY_KEY_REUSED");
  });
  it("makes fingerprints independent of object property order", () => {
    expect(stableFingerprint({ a: 1, b: [2, 3] })).toBe(stableFingerprint({ b: [2, 3], a: 1 }));
  });
});
