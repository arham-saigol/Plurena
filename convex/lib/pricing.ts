export const PRICE_VERSION = "panel-v1";
export const ONBOARDING_BONUS_CENTS = 600;
export const MIN_TOP_UP_CENTS = 1_000;

export const PANEL_PRICES = [
  { size: 20, priceCents: 500, discountPercent: 0 },
  { size: 30, priceCents: 720, discountPercent: 4 },
  { size: 35, priceCents: 823, discountPercent: 6 },
  { size: 50, priceCents: 1_125, discountPercent: 10 },
  { size: 75, priceCents: 1_594, discountPercent: 15 },
  { size: 100, priceCents: 2_000, discountPercent: 20 },
  { size: 150, priceCents: 2_700, discountPercent: 28 },
  { size: 250, priceCents: 4_000, discountPercent: 36 },
] as const;

export type PanelSize = (typeof PANEL_PRICES)[number]["size"];

export function quotePanel(size: number) {
  const entry = PANEL_PRICES.find((item) => item.size === size);
  if (!entry) throw new Error("INVALID_PANEL_SIZE");
  return { ...entry, priceVersion: PRICE_VERSION };
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
