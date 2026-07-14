import { describe, expect, it } from "vitest";
import { assertAuthenticated, assertOwner } from "@/convex/lib/authorization";

describe("ownership boundary", () => {
  it("accepts the authenticated owner", () => expect(assertOwner("user-a", "user-a")).toBe(true));
  it("returns the same not-found error for a foreign document", () => expect(() => assertOwner("user-a", "user-b")).toThrow("NOT_FOUND"));
  it("rejects missing identities", () => expect(() => assertAuthenticated(null)).toThrow("UNAUTHENTICATED"));
});
