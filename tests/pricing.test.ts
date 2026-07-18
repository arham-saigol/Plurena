import { describe, expect, it } from "vitest";
import { isValidTopUpAmount, MAX_TOP_UP_CENTS, MIN_TOP_UP_CENTS, ONBOARDING_BONUS_CENTS, PANEL_PRICES, PRICE_VERSION, TOP_UP_INCREMENT_CENTS, quotePanel } from "@/convex/lib/pricing";

describe("server panel pricing", () => {
  it("keeps every fixed panel position and its exact price", () => {
    expect(PRICE_VERSION).toBe("panel-v2");
    expect(PANEL_PRICES.map((item) => item.size)).toEqual([20, 50, 100, 150, 250]);
    expect(PANEL_PRICES.map((item) => item.priceCents)).toEqual([500, 1_000, 1_800, 2_500, 3_800]);
    expect(quotePanel(20)).toEqual({ size: 20, priceCents: 500, discountPercent: 0, priceVersion: PRICE_VERSION });
    expect(quotePanel(250).priceCents).toBe(3_800);
  });
  it("makes the earned bonus cover one minimum panel", () => {
    expect(ONBOARDING_BONUS_CENTS).toBe(600);
    expect(ONBOARDING_BONUS_CENTS).toBeGreaterThanOrEqual(quotePanel(20).priceCents);
    expect(MIN_TOP_UP_CENTS).toBe(500);
  });
  it("accepts top-ups from $5 to $500 in $5 increments", () => {
    expect(TOP_UP_INCREMENT_CENTS).toBe(500);
    expect(MAX_TOP_UP_CENTS).toBe(50_000);
    expect(isValidTopUpAmount(500)).toBe(true);
    expect(isValidTopUpAmount(50_000)).toBe(true);
    expect(isValidTopUpAmount(0)).toBe(false);
    expect(isValidTopUpAmount(750)).toBe(false);
    expect(isValidTopUpAmount(50_500)).toBe(false);
  });
  it("rejects arbitrary sizes", () => expect(() => quotePanel(21)).toThrow("INVALID_PANEL_SIZE"));
  it("applies increasing visible discounts", () => {
    expect(PANEL_PRICES.map((item) => item.discountPercent)).toEqual([0, 20, 28, 33, 39]);
  });
});
