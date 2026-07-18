export const PRICE_VERSION = "panel-v2";
export const ONBOARDING_BONUS_CENTS = 600;
export const MIN_TOP_UP_CENTS = 500;
export const MAX_TOP_UP_CENTS = 50_000;
export const TOP_UP_INCREMENT_CENTS = 500;

export function isValidTopUpAmount(amountCents: number) {
  return Number.isInteger(amountCents)
    && amountCents >= MIN_TOP_UP_CENTS
    && amountCents <= MAX_TOP_UP_CENTS
    && amountCents % TOP_UP_INCREMENT_CENTS === 0;
}

export const PANEL_PRICES = [
  { size: 20, priceCents: 500, discountPercent: 0 },
  { size: 50, priceCents: 1_000, discountPercent: 20 },
  { size: 100, priceCents: 1_800, discountPercent: 28 },
  { size: 150, priceCents: 2_500, discountPercent: 33 },
  { size: 250, priceCents: 3_800, discountPercent: 39 },
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
