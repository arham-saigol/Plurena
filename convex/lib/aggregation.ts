import type { Id } from "../_generated/dataModel";

type AggregateOption = {
  _id: Id<"snapshotOptions">;
  position: number;
};

type AggregateResponse = {
  selectedOptionId: Id<"snapshotOptions">;
  confidence: "low" | "medium" | "high";
  confidenceScore: number;
};

export function aggregateResponses(
  options: Array<AggregateOption>,
  responses: Array<AggregateResponse>,
) {
  const confidenceDistribution = { low: 0, medium: 0, high: 0 };
  const byOption = new Map(
    options.map((option) => [
      option._id,
      { optionId: option._id, position: option.position, votes: 0, score: 0 },
    ]),
  );

  for (const response of responses) {
    confidenceDistribution[response.confidence] += 1;
    const result = byOption.get(response.selectedOptionId);
    if (result) {
      result.votes += 1;
      result.score += response.confidenceScore;
    }
  }

  const total = responses.length;
  const optionResults = [...byOption.values()]
    .map((result) => ({
      optionId: result.optionId,
      position: result.position,
      votes: result.votes,
      percentage: total === 0 ? 0 : result.votes / total,
      averageConfidence: result.votes === 0 ? 0 : result.score / result.votes,
    }))
    .sort((a, b) => b.votes - a.votes || a.position - b.position)
    .map((result, index) => ({ ...result, rank: index + 1 }));

  const first = optionResults[0];
  const second = optionResults[1];
  const tied = Boolean(first && second && first.votes === second.votes);
  const margin = first && second ? first.percentage - second.percentage : 0;
  const outcomeLabel =
    total === 0
      ? "No result"
      : tied
        ? "Tie"
        : margin < 0.05
          ? "Close result"
          : "Winner";
  const strengthLabel =
    total === 0
      ? "No evidence"
      : tied
        ? "Evenly split"
        : margin >= 0.15
          ? "Strong preference"
          : margin >= 0.05
            ? "Moderate preference"
            : "Weak preference";

  return {
    optionResults,
    confidenceDistribution,
    winningOptionId: tied ? undefined : first?.optionId,
    outcomeLabel,
    strengthLabel,
  };
}

export function calculateFailureCreditRefund(
  chargedCredits: number,
  successful: number,
  failed: number,
) {
  if (failed === 0) return 0;
  if (successful === 0) return chargedCredits;
  return Math.min(chargedCredits, failed);
}
