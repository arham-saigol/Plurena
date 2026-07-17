export type SynthesisResponse = {
  choiceOptionId?: unknown;
  answer?: string;
  feedback: string[];
  confidence?: number;
  decisionFactors?: Array<{ factor: string; influence: string; reason: string }>;
  missingEvidence?: string[];
  personaOrdinal?: number;
  segmentName?: string;
};

export function buildSynthesisResponseEvidence(responses: SynthesisResponse[]) {
  const selected = responses.map((response) => {
    return {
      personaOrdinal: response.personaOrdinal,
      segmentName: response.segmentName?.slice(0, 80),
      choiceOptionId: response.choiceOptionId ? String(response.choiceOptionId) : null,
      answer: response.answer?.slice(0, 600),
      feedback: response.feedback.slice(0, 3).map((point) => point.slice(0, 300)),
      confidence: response.confidence,
      decisionFactors: response.decisionFactors?.slice(0, 3).map((item) => ({
        factor: item.factor.slice(0, 120),
        influence: item.influence,
        reason: item.reason.slice(0, 300),
      })),
      missingEvidence: response.missingEvidence?.slice(0, 2).map((item) => item.slice(0, 200)),
    };
  });

  return {
    responses: selected,
    includedResponseCount: selected.length,
    omittedResponseCount: 0,
    truncated: false,
  };
}
