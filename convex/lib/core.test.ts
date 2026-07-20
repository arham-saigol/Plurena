import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import { aggregateResponses, calculateFailureRefund } from "./aggregation";
import {
  classifyProviderError,
  getModelRoutes,
  MODEL_KEYS,
  ROUTED_GENERATION_DEADLINE_MS,
  ROUTED_GENERATION_LEASE_MS,
} from "./models";
import { getPriceCents, RESPONDENT_COUNTS } from "./pricing";
import {
  finalNarrativeSchema,
  personaBatchSchema,
  respondentResultSchema,
} from "./structuredSchemas";

describe("server-owned pricing", () => {
  it("matches every supported respondent tier", () => {
    expect(RESPONDENT_COUNTS).toEqual([20, 50, 75, 100, 150, 200, 250]);
    expect(RESPONDENT_COUNTS.map(getPriceCents)).toEqual([
      500, 1_000, 1_400, 1_800, 2_500, 3_300, 4_000,
    ]);
    expect(() => getPriceCents(21)).toThrow("Unsupported respondent count");
  });
});

describe("deterministic aggregation and refunds", () => {
  it("ranks by votes, calculates confidence, and reports a strong winner", () => {
    const first = "option-a" as Id<"snapshotOptions">;
    const second = "option-b" as Id<"snapshotOptions">;
    const result = aggregateResponses(
      [
        { _id: first, position: 0 },
        { _id: second, position: 1 },
      ],
      [
        ...Array.from({ length: 8 }, () => ({
          selectedOptionId: first,
          confidence: "high" as const,
          confidenceScore: 0.9,
        })),
        ...Array.from({ length: 2 }, () => ({
          selectedOptionId: second,
          confidence: "medium" as const,
          confidenceScore: 0.6,
        })),
      ],
    );
    expect(result.winningOptionId).toBe(first);
    expect(result.optionResults[0]).toMatchObject({
      votes: 8,
      percentage: 0.8,
    });
    expect(result.optionResults[0].averageConfidence).toBeCloseTo(0.9);
    expect(result.strengthLabel).toBe("Strong preference");
    expect(result.confidenceDistribution).toEqual({
      low: 0,
      medium: 2,
      high: 8,
    });
  });

  it("handles ties and proportionally refunds failed responses", () => {
    const first = "option-a" as Id<"snapshotOptions">;
    const second = "option-b" as Id<"snapshotOptions">;
    const result = aggregateResponses(
      [
        { _id: first, position: 0 },
        { _id: second, position: 1 },
      ],
      [
        { selectedOptionId: first, confidence: "low", confidenceScore: 0.2 },
        { selectedOptionId: second, confidence: "low", confidenceScore: 0.2 },
      ],
    );
    expect(result.winningOptionId).toBeUndefined();
    expect(result.outcomeLabel).toBe("Tie");
    expect(calculateFailureRefund(1_000, 40, 10)).toBe(200);
    expect(calculateFailureRefund(500, 0, 20)).toBe(500);
  });
});

describe("model routing policy", () => {
  it("keeps the requested model first and only sends images to vision models", () => {
    expect(getModelRoutes("glm_5_2", false)[0]).toMatchObject({
      modelKey: "glm_5_2",
      provider: "opencode_go",
    });
    const visionRoutes = getModelRoutes("glm_5_2", true);
    expect(
      visionRoutes.every((route) =>
        [
          "minimax_m3",
          "kimi_k2_6",
          "kimi_k2_7_code",
          "qwen3_7_plus",
          "mimo_v2_5",
          "step_3_7_flash",
        ].includes(route.modelKey),
      ),
    ).toBe(true);
    expect(MODEL_KEYS).toHaveLength(10);
  });

  it("keeps routed generation and its lease below the action limit", () => {
    expect(ROUTED_GENERATION_DEADLINE_MS).toBeLessThan(10 * 60_000);
    expect(ROUTED_GENERATION_LEASE_MS).toBeLessThan(10 * 60_000);
    expect(ROUTED_GENERATION_LEASE_MS).toBeGreaterThan(
      ROUTED_GENERATION_DEADLINE_MS,
    );
  });

  it("retries transient failures but stops on credential and input failures", () => {
    expect(classifyProviderError({ status: 429 })).toEqual({
      classification: "rate_limit",
      retryable: true,
    });
    expect(classifyProviderError({ statusCode: 503 })).toEqual({
      classification: "provider_unavailable",
      retryable: true,
    });
    expect(classifyProviderError({ status: 401 })).toEqual({
      classification: "authentication",
      retryable: false,
    });
    expect(
      classifyProviderError(new Error("schema validation failed")),
    ).toEqual({ classification: "schema", retryable: false });
  });
});

describe("structured AI boundaries", () => {
  it("accepts a complete persona batch and rejects shallow personas", () => {
    const persona = {
      displayName: "Pragmatic evaluator",
      background:
        "Runs a small team and compares new tools against an established manual workflow.",
      goals: ["Reduce time spent on repetitive review"],
      motivations: ["Show measurable gains to the wider team"],
      frustrations: ["Tools that make unsupported promises"],
      decisionDrivers: ["Clear proof and predictable pricing"],
      familiarity: "considering" as const,
      behavioralTraits: ["Methodical buyer", "Evidence seeking"],
      reasoningStyle:
        "Compares concrete tradeoffs before changing the current workflow.",
      priceSensitivity: "Moderate when value is demonstrated",
      soul: "I want a useful shortcut, but I need enough evidence to defend the switch to my team.",
    };
    expect(personaBatchSchema.safeParse({ personas: [persona] }).success).toBe(
      true,
    );
    expect(
      personaBatchSchema.safeParse({ personas: [{ displayName: "x" }] })
        .success,
    ).toBe(false);
  });

  it("rejects invalid response positions, confidence, and incomplete final reports", () => {
    expect(
      respondentResultSchema.safeParse({
        selectedOptionPosition: -1,
        reasons: [],
        comparisons: [],
        confidence: "certain",
        confidenceScore: 2,
        objection: null,
      }).success,
    ).toBe(false);
    expect(
      finalNarrativeSchema.safeParse({ executiveSummary: "Too short" }).success,
    ).toBe(false);
  });
});
