import { describe, expect, it } from "vitest";
import { buildSynthesisResponseEvidence } from "@/convex/lib/synthesisEvidence";

describe("synthesis evidence", () => {
  it("includes every response in a 250-person panel", () => {
    const responses = Array.from({ length: 250 }, (_, index) => ({
      personaOrdinal: index,
      segmentName: index % 2 ? "Active comparers" : "Early explorers",
      choiceOptionId: index === 249 ? "minority" : index % 2 ? "a" : "b",
      answer: "x".repeat(1_500),
      feedback: Array.from({ length: 5 }, () => "y".repeat(500)),
    }));
    const evidence = buildSynthesisResponseEvidence(responses);

    expect(evidence.includedResponseCount).toBe(250);
    expect(evidence.omittedResponseCount).toBe(0);
    expect(evidence.truncated).toBe(false);
    expect(evidence.responses.some((item) => item.choiceOptionId === "minority")).toBe(true);
    expect(evidence.responses[1]).toMatchObject({ personaOrdinal: 1, segmentName: "Active comparers" });
  });
});
