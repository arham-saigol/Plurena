export const CREDIT_OPTIONS = [
  {
    key: "credits_50",
    priceCents: 1_000,
    credits: 50,
    bonusPercent: 0,
    productEnvKey: "CREEM_PRODUCT_ID_10",
  },
  {
    key: "credits_135",
    priceCents: 2_500,
    credits: 135,
    bonusPercent: 8,
    productEnvKey: "CREEM_PRODUCT_ID_25",
  },
  {
    key: "credits_275",
    priceCents: 5_000,
    credits: 275,
    bonusPercent: 10,
    productEnvKey: "CREEM_PRODUCT_ID_50",
  },
  {
    key: "credits_575",
    priceCents: 10_000,
    credits: 575,
    bonusPercent: 15,
    productEnvKey: "CREEM_PRODUCT_ID_100",
  },
  {
    key: "credits_1200",
    priceCents: 20_000,
    credits: 1_200,
    bonusPercent: 20,
    productEnvKey: "CREEM_PRODUCT_ID_200",
  },
  {
    key: "credits_2500",
    priceCents: 40_000,
    credits: 2_500,
    bonusPercent: 25,
    productEnvKey: "CREEM_PRODUCT_ID_400",
  },
] as const;

export const BASE_CREDITS_PER_DOLLAR = 5;
export const RESPONDENT_COUNTS = [20, 50, 75, 100, 150, 200, 250] as const;

export type CreditOptionKey = (typeof CREDIT_OPTIONS)[number]["key"];

type CreditProductEnvironment = Partial<
  Record<(typeof CREDIT_OPTIONS)[number]["productEnvKey"], string>
>;

export function getCreditOption(key: CreditOptionKey) {
  const option = CREDIT_OPTIONS.find((candidate) => candidate.key === key);
  if (!option) throw new Error("Unsupported credit option");
  return option;
}

export function getConfiguredCreditOption(
  key: CreditOptionKey,
  environment: CreditProductEnvironment,
) {
  const option = getCreditOption(key);
  const productId = environment[option.productEnvKey]?.trim();
  if (!productId) {
    throw new Error(`${option.productEnvKey} is not configured`);
  }
  const duplicate = CREDIT_OPTIONS.some(
    (candidate) =>
      candidate.key !== option.key &&
      environment[candidate.productEnvKey]?.trim() === productId,
  );
  if (duplicate) throw new Error("Creem product IDs must be unique");
  return { ...option, productId };
}

export function getTestCreditCost(respondentCount: number) {
  if (!Number.isSafeInteger(respondentCount) || respondentCount <= 0) {
    throw new Error("Respondent count must be a positive integer");
  }
  return respondentCount;
}
