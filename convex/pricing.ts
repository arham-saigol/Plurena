import { query } from "./_generated/server";
import { MIN_TOP_UP_CENTS, ONBOARDING_BONUS_CENTS, PANEL_PRICES, PRICE_VERSION } from "./lib/pricing";

export const getConfig = query({
  args: {},
  handler: async () => ({
    version: PRICE_VERSION,
    onboardingBonusCents: ONBOARDING_BONUS_CENTS,
    minimumTopUpCents: MIN_TOP_UP_CENTS,
    panels: PANEL_PRICES.map((item) => ({ ...item })),
  }),
});
