import { describe, expect, it } from "vitest";
import { applyCreditEntry } from "@/convex/lib/credits";

describe("credit ledger invariants", () => {
  it("applies a grant and charge as integer cents", () => {
    const granted = applyCreditEntry({ balanceCents: 0, appliedKeys: new Set() }, "onboarding:user-1", 600);
    const charged = applyCreditEntry(granted, "test:test-1:charge", -500);
    expect(charged.balanceCents).toBe(100);
  });
  it("makes duplicate payment and test events no-ops", () => {
    const state = applyCreditEntry({ balanceCents: 0, appliedKeys: new Set() }, "creem:checkout-1", 1_000);
    expect(applyCreditEntry(state, "creem:checkout-1", 1_000)).toBe(state);
    const charged = applyCreditEntry(state, "test:test-1:charge", -500);
    expect(applyCreditEntry(charged, "test:test-1:charge", -500)).toBe(charged);
  });
  it("blocks a launch that would overdraw the balance", () => {
    expect(() => applyCreditEntry({ balanceCents: 499, appliedKeys: new Set() }, "test:x:charge", -500)).toThrow("INSUFFICIENT_CREDIT");
  });
});
