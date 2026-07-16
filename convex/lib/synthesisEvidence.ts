export type SynthesisResponse = {
  choiceOptionId?: unknown;
  answer?: string;
  feedback: string[];
};

export function buildSynthesisResponseEvidence(responses: SynthesisResponse[]) {
  const selected = responses.map((response) => {
    return {
      choiceOptionId: response.choiceOptionId ? String(response.choiceOptionId) : null,
      answer: response.answer?.slice(0, 600),
      feedback: response.feedback.slice(0, 3).map((point) => point.slice(0, 300)),
    };
  });

  return {
    responses: selected,
    includedResponseCount: selected.length,
    omittedResponseCount: 0,
    truncated: false,
  };
}
