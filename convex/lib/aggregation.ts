export type ComparableResponse = { choiceOptionId?: string; answer?: string; feedback: string[] };

export function aggregateComparison(optionIds: string[], responses: ComparableResponse[]) {
  const counts = Object.fromEntries(optionIds.map((id) => [id, 0])) as Record<string, number>;
  let noneOfAbove = 0;
  for (const response of responses) {
    if (response.choiceOptionId && response.choiceOptionId in counts) counts[response.choiceOptionId] += 1;
    else noneOfAbove += 1;
  }
  const ranked = Object.entries(counts)
    .map(([optionId, votes]) => ({
      optionId,
      votes,
      share: responses.length ? Math.round((votes / responses.length) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.votes - a.votes || a.optionId.localeCompare(b.optionId));
  const topVotes = ranked[0]?.votes ?? 0;
  const tiedLeaderOptionIds = topVotes > 0 ? ranked.filter((item) => item.votes === topVotes).map((item) => item.optionId) : [];
  const winnerOptionId = tiedLeaderOptionIds.length === 1 && topVotes > noneOfAbove ? tiedLeaderOptionIds[0] : undefined;
  return {
    ranked,
    noneOfAbove,
    total: responses.length,
    winnerOptionId,
    tiedLeaderOptionIds: winnerOptionId ? [] : tiedLeaderOptionIds,
    noneOfAboveLed: noneOfAbove > 0 && noneOfAbove >= topVotes,
  };
}

export function aggregateOpenEnded(responses: ComparableResponse[]) {
  const answers = responses.map((item) => item.answer?.trim()).filter((item): item is string => Boolean(item));
  const wordCounts = new Map<string, number>();
  for (const answer of answers) {
    const unique = new Set(answer.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []);
    for (const word of unique) {
      if (["that", "this", "with", "have", "would", "from", "they", "their", "about"].includes(word)) continue;
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }
  const commonTerms = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));
  return { total: answers.length, commonTerms, sampleAnswers: answers.slice(0, 8) };
}
