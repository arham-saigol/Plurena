export const PRICING_CENTS = {
  20: 500,
  50: 1_000,
  75: 1_400,
  100: 1_800,
  150: 2_500,
  200: 3_300,
  250: 4_000,
} as const;

export type RespondentCount = keyof typeof PRICING_CENTS;

export const RESPONDENT_COUNTS = Object.keys(PRICING_CENTS).map(
  Number,
) as Array<RespondentCount>;

export function isRespondentCount(value: number): value is RespondentCount {
  return Object.hasOwn(PRICING_CENTS, value);
}

export function getPriceCents(respondentCount: number) {
  if (!isRespondentCount(respondentCount)) {
    throw new Error("Unsupported respondent count");
  }
  return PRICING_CENTS[respondentCount];
}
