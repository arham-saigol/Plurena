export type SynthesisResponse = {
  choiceOptionId?: unknown;
  answer?: string;
  feedback: string[];
};

export const SYNTHESIS_EVIDENCE_BUDGET = 120_000;
export const SYNTHESIS_RESPONSE_LIMIT = 80;

export function buildSynthesisResponseEvidence(
  responses: SynthesisResponse[],
  budget = SYNTHESIS_EVIDENCE_BUDGET,
) {
  const groups = new Map<string, SynthesisResponse[]>();
  for (const response of responses) {
    const key = response.choiceOptionId ? String(response.choiceOptionId) : "none-or-open";
    const group = groups.get(key) ?? [];
    group.push(response);
    groups.set(key, group);
  }

  const perGroupLimit = Math.max(1, Math.ceil(SYNTHESIS_RESPONSE_LIMIT / Math.max(groups.size, 1)));
  const orderedGroups = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => [key, evenlySample(group, perGroupLimit)] as const);
  const candidates: SynthesisResponse[] = [];
  for (let offset = 0; candidates.length < SYNTHESIS_RESPONSE_LIMIT; offset += 1) {
    let added = false;
    for (const [, group] of orderedGroups) {
      if (offset < group.length) {
        candidates.push(group[offset]);
        added = true;
        if (candidates.length === SYNTHESIS_RESPONSE_LIMIT) break;
      }
    }
    if (!added) break;
  }

  const selected: Array<{ choiceOptionId: string | null; answer?: string; feedback: string[] }> = [];
  let usedCharacters = 2;
  for (const response of candidates) {
    const item = {
      choiceOptionId: response.choiceOptionId ? String(response.choiceOptionId) : null,
      answer: response.answer?.slice(0, 600),
      feedback: response.feedback.slice(0, 3).map((point) => point.slice(0, 300)),
    };
    const size = JSON.stringify(item).length + 1;
    if (usedCharacters + size > budget) break;
    selected.push(item);
    usedCharacters += size;
  }

  return {
    responses: selected,
    includedResponseCount: selected.length,
    omittedResponseCount: Math.max(0, responses.length - selected.length),
    truncated: selected.length < responses.length,
  };
}

function evenlySample<T>(values: T[], limit: number) {
  if (values.length <= limit) return values;
  if (limit === 1) return [values[0]];
  return Array.from({ length: limit }, (_, index) => values[Math.round((index * (values.length - 1)) / (limit - 1))]);
}
