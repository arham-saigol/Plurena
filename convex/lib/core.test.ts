import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  aggregateResponses,
  calculateFailureCreditRefund,
} from "./aggregation";
import {
  BASE_CREDITS_PER_DOLLAR,
  CREDIT_OPTIONS,
  getConfiguredCreditOption,
  getTestCreditCost,
  RESPONDENT_COUNTS,
} from "./credits";
import {
  classifyProviderError,
  getModelForAttempt,
  getModelRoutes,
  getRespondentModels,
  ModelOutputValidationError,
  MODEL_CATALOG,
  MODEL_KEYS,
  ROUTED_GENERATION_DEADLINE_MS,
  ROUTED_GENERATION_LEASE_MS,
} from "./models";
import {
  finalNarrativeSchema,
  personaBatchSchema,
  respondentResultSchema,
} from "./structuredSchemas";

describe("server-owned credit economics", () => {
  it("charges exactly one credit for every supported respondent count", () => {
    expect(RESPONDENT_COUNTS).toEqual([20, 50, 75, 100, 150, 200, 250]);
    expect(RESPONDENT_COUNTS.map(getTestCreditCost)).toEqual([
      20, 50, 75, 100, 150, 200, 250,
    ]);
    expect(() => getTestCreditCost(0)).toThrow(
      "Respondent count must be a positive integer",
    );
  });

  it("defines fixed purchases with progressively larger bonuses", () => {
    expect(
      CREDIT_OPTIONS.map(({ priceCents, credits, bonusPercent }) => ({
        priceCents,
        credits,
        bonusPercent,
      })),
    ).toEqual([
      { priceCents: 1_000, credits: 50, bonusPercent: 0 },
      { priceCents: 2_500, credits: 135, bonusPercent: 8 },
      { priceCents: 5_000, credits: 275, bonusPercent: 10 },
      { priceCents: 10_000, credits: 575, bonusPercent: 15 },
      { priceCents: 20_000, credits: 1_200, bonusPercent: 20 },
      { priceCents: 40_000, credits: 2_500, bonusPercent: 25 },
    ]);
    for (const option of CREDIT_OPTIONS) {
      const baseCredits = (option.priceCents / 100) * BASE_CREDITS_PER_DOLLAR;
      expect(option.credits).toBe(
        baseCredits * (1 + option.bonusPercent / 100),
      );
    }
    expect(() =>
      getConfiguredCreditOption("credits_50", {
        CREEM_PRODUCT_ID_10: "duplicate",
        CREEM_PRODUCT_ID_25: "duplicate",
      }),
    ).toThrow("Creem product IDs must be unique");
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

  it("handles ties and refunds one credit per failed response", () => {
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
    expect(calculateFailureCreditRefund(50, 40, 10)).toBe(10);
    expect(calculateFailureCreditRefund(20, 0, 20)).toBe(20);
  });
});

describe("model routing policy", () => {
  it("uses the configured primary, fallback, and vision capability for every model", () => {
    const expected = {
      minimax_m3: {
        vision: true,
        routes: [
          ["opencode_go", "anthropic", "minimax-m3"],
          ["ai_gateway", "openai", "minimax/minimax-m3"],
        ],
      },
      glm_5_2: {
        vision: false,
        routes: [
          ["opencode_go", "openai", "glm-5.2"],
          ["ai_gateway", "openai", "zai/glm-5.2"],
        ],
      },
      deepseek_v4_pro: {
        vision: false,
        routes: [
          ["opencode_go", "openai", "deepseek-v4-pro"],
          ["ai_gateway", "openai", "deepseek/deepseek-v4-pro"],
        ],
      },
      deepseek_v4_flash: {
        vision: false,
        routes: [
          ["opencode_go", "openai", "deepseek-v4-flash"],
          ["ai_gateway", "openai", "deepseek/deepseek-v4-flash"],
        ],
      },
      kimi_k2_6: {
        vision: true,
        routes: [
          ["opencode_go", "openai", "kimi-k2.6"],
          ["ai_gateway", "openai", "moonshotai/kimi-k2.6"],
        ],
      },
      kimi_k2_7_code: {
        vision: true,
        routes: [
          ["opencode_go", "openai", "kimi-k2.7-code"],
          ["ai_gateway", "openai", "moonshotai/kimi-k2.7-code"],
        ],
      },
      qwen3_7_plus: {
        vision: true,
        routes: [
          ["opencode_go", "anthropic", "qwen3.7-plus"],
          ["ai_gateway", "openai", "alibaba/qwen3.7-plus"],
        ],
      },
      mimo_v2_5: {
        vision: true,
        routes: [
          ["opencode_go", "openai", "mimo-v2.5"],
          ["ai_gateway", "openai", "xiaomi/mimo-v2.5"],
        ],
      },
      hy3: {
        vision: false,
        routes: [
          ["opencode_go", "openai", "hy3"],
          ["ai_gateway", "openai", "tencent/hy3"],
        ],
      },
      step_3_7_flash: {
        vision: true,
        routes: [
          ["stepfun", "openai", "step-3.7-flash"],
          ["ai_gateway", "openai", "stepfun/step-3.7-flash"],
        ],
      },
      laguna_s_2_1: {
        vision: false,
        routes: [
          ["ai_gateway", "openai", "poolside/laguna-s-2.1-free"],
          ["ai_gateway", "openai", "poolside/laguna-s-2.1"],
        ],
      },
    } as const;

    expect(MODEL_KEYS).toEqual(Object.keys(expected));
    for (const modelKey of MODEL_KEYS) {
      const model = MODEL_CATALOG[modelKey];
      expect(model.vision).toBe(expected[modelKey].vision);
      expect(
        getModelRoutes(modelKey, model.vision)
          .slice(0, model.routes.length)
          .map((route) => [route.provider, route.protocol, route.modelId]),
      ).toEqual(expected[modelKey].routes);
    }
  });

  it("only sends images to vision models", () => {
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
  });

  it("distributes text respondents across every supported model", () => {
    expect(getRespondentModels(false)).toEqual(MODEL_KEYS);
  });

  it("distributes image respondents only across every vision model", () => {
    const visionModels = MODEL_KEYS.filter(
      (modelKey) => MODEL_CATALOG[modelKey].vision,
    );

    expect(getRespondentModels(true)).toEqual(visionModels);
  });

  it("rotates retries to another capability-eligible model", () => {
    expect(getModelForAttempt("glm_5_2", false, 1)).toBe("glm_5_2");
    expect(getModelForAttempt("glm_5_2", false, 2)).not.toBe("glm_5_2");

    const replacement = getModelForAttempt("minimax_m3", true, 2);
    expect(replacement).not.toBe("minimax_m3");
    expect(MODEL_CATALOG[replacement].vision).toBe(true);
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
    expect(
      classifyProviderError(
        new ModelOutputValidationError("Invalid option position"),
      ),
    ).toEqual({ classification: "schema", retryable: true });
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
