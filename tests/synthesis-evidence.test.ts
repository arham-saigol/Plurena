import { describe, expect, it } from "vitest";
import { buildSynthesisResponseEvidence, SYNTHESIS_EVIDENCE_BUDGET, SYNTHESIS_RESPONSE_LIMIT } from "@/convex/lib/synthesisEvidence";

describe("synthesis evidence budget", () => {
  it("bounds a 250-person panel while retaining each comparison group", () => {
    const responses = Array.from({ length: 250 }, (_, index) => ({
      choiceOptionId: index === 249 ? "minority" : index % 2 ? "a" : "b",
      answer: "x".repeat(1_500),
      feedback: Array.from({ length: 5 }, () => "y".repeat(500)),
    }));
    const evidence = buildSynthesisResponseEvidence(responses);
    expect(evidence.includedResponseCount).toBeLessThanOrEqual(SYNTHESIS_RESPONSE_LIMIT);
    expect(JSON.stringify(evidence.responses).length).toBeLessThanOrEqual(SYNTHESIS_EVIDENCE_BUDGET);
    expect(evidence.omittedResponseCount).toBeGreaterThan(0);
    expect(evidence.responses.some((item) => item.choiceOptionId === "minority")).toBe(true);
  });
});
