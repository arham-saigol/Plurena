export type CreditState = { balanceCents: number; appliedKeys: ReadonlySet<string> };

export function applyCreditEntry(state: CreditState, idempotencyKey: string, amountCents: number, allowNegative = false): CreditState {
  if (!idempotencyKey) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  if (!Number.isSafeInteger(amountCents) || amountCents === 0) throw new Error("INVALID_CREDIT_AMOUNT");
  if (state.appliedKeys.has(idempotencyKey)) return state;
  const balanceCents = state.balanceCents + amountCents;
  if (!allowNegative && balanceCents < 0) throw new Error("INSUFFICIENT_CREDIT");
  return { balanceCents, appliedKeys: new Set([...state.appliedKeys, idempotencyKey]) };
}
