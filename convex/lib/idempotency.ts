export type IdempotentRecord<T> = { key: string; fingerprint: string; value: T };

export function resolveIdempotent<T>(existing: IdempotentRecord<T> | undefined, key: string, fingerprint: string) {
  if (!existing) return undefined;
  if (existing.key !== key || existing.fingerprint !== fingerprint) throw new Error("IDEMPOTENCY_KEY_REUSED");
  return existing.value;
}

export function stableFingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableFingerprint).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableFingerprint(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
