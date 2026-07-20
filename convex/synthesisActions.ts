"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { aggregateResponses } from "./lib/aggregation";
import {
  generateStructured,
  RoutedGenerationError,
  type ProviderAttempt,
} from "./lib/ai";
import {
  classifyProviderError,
  ModelOutputValidationError,
} from "./lib/models";
import {
  finalNarrativeSchema,
  groupSummarySchema,
} from "./lib/structuredSchemas";

type SynthesisBatchPayload = {
  batch: Doc<"synthesisBatches">;
  snapshot: Doc<"testSnapshots">;
  options: Array<Doc<"snapshotOptions">>;
  responses: Array<{
    response: Doc<"responses">;
    persona: Doc<"personas">;
  }>;
};

type FinalPayload = {
  batch: Doc<"synthesisBatches">;
  test: Doc<"tests">;
  snapshot: Doc<"testSnapshots">;
  options: Array<Doc<"snapshotOptions">>;
  responses: Array<Doc<"responses">>;
  summaries: Array<{
    summary?: string;
    themes?: Array<string>;
    objections?: Array<string>;
    segmentSignals?: Array<string>;
    failed: boolean;
  }>;
};

async function recordAttempts(
  ctx: ActionCtx,
  input: {
    testId: Id<"tests">;
    ownerId: Id<"users">;
    phase: string;
    workKey: string;
    attempts: Array<ProviderAttempt>;
  },
) {
  if (input.attempts.length === 0) return;
  await ctx.runMutation(internal.execution.recordProviderAttempts, input);
}

export const summarizeBatch = internalAction({
  args: { batchId: v.id("synthesisBatches") },
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(internal.synthesis.claimBatch, args);
    if (!claimed) return null;
    const payload: SynthesisBatchPayload | null = await ctx.runQuery(
      internal.synthesis.getBatchPayload,
      args,
    );
    if (!payload) return null;
    const workKey = `synthesis-group:${payload.batch._id}`;
    let attempts: Array<ProviderAttempt> = [];
    try {
      const optionById = new Map(
        payload.options.map((option) => [option._id, option]),
      );
      const evidence = payload.responses
        .map(({ response, persona }, index) => {
          const option = optionById.get(response.selectedOptionId);
          return `Response ${index + 1}\nPersona: ${persona.displayName} — ${persona.background}\nSelected: ${option?.label ?? "Unknown"}\nConfidence: ${response.confidence} (${response.confidenceScore.toFixed(2)})\nReasons: ${response.reasons.join("; ")}\nComparisons: ${response.comparisons.join("; ")}\nObjection: ${response.objection ?? "None stated"}`;
        })
        .join("\n\n");
      const result = await generateStructured({
        requestedModel: "glm_5_2",
        requiresVision: false,
        schema: groupSummarySchema,
        system:
          "Synthesize a bounded group of synthetic research responses. Make no tool calls. Ground every point in the supplied responses. Do not invent quotations, statistics, segments, or claims. Return concise structured research notes.",
        prompt: `Test question: ${payload.snapshot.question}\nAudience: ${payload.snapshot.audience}\n\nEvidence group:\n${evidence}`,
        maxOutputTokens: 2_500,
      });
      attempts = result.attempts;
      await recordAttempts(ctx, {
        testId: payload.batch.testId,
        ownerId: payload.batch.ownerId,
        phase: "synthesis_group",
        workKey,
        attempts,
      });
      await ctx.runMutation(internal.synthesis.completeBatch, {
        batchId: payload.batch._id,
        ...result.output,
      });
      return null;
    } catch (error) {
      const routed = error instanceof RoutedGenerationError ? error : undefined;
      if (routed) attempts = routed.attempts;
      await recordAttempts(ctx, {
        testId: payload.batch.testId,
        ownerId: payload.batch.ownerId,
        phase: "synthesis_group",
        workKey,
        attempts,
      });
      const classified = routed ?? classifyProviderError(error);
      await ctx.runMutation(internal.synthesis.failBatch, {
        batchId: payload.batch._id,
        retryable: routed ? routed.retryable : classified.retryable,
        errorMessage:
          error instanceof Error ? error.message : "Synthesis group failed",
      });
      return null;
    }
  },
});

export const finalizeReport = internalAction({
  args: { batchId: v.id("synthesisBatches") },
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(internal.synthesis.claimBatch, args);
    if (!claimed) return null;
    const payload: FinalPayload | null = await ctx.runQuery(
      internal.synthesis.getFinalPayload,
      args,
    );
    if (!payload) return null;
    const workKey = `synthesis-final:${payload.batch._id}`;
    let attempts: Array<ProviderAttempt> = [];
    try {
      const aggregates = aggregateResponses(payload.options, payload.responses);
      const optionById = new Map(
        payload.options.map((option) => [option._id, option]),
      );
      const exactResults = aggregates.optionResults
        .map((result) => {
          const option = optionById.get(result.optionId);
          return `Position ${option?.position ?? -1} (${option?.label ?? "Unknown"}): ${result.votes} votes, ${(result.percentage * 100).toFixed(2)}%, mean preference confidence ${result.averageConfidence.toFixed(2)}`;
        })
        .join("\n");
      const summaries = payload.summaries
        .map(
          (summary, index) =>
            `Group ${index + 1}${summary.failed ? " (synthesis unavailable)" : ""}:\n${summary.summary ?? "No summary"}\nThemes: ${summary.themes?.join("; ") ?? "None"}\nObjections: ${summary.objections?.join("; ") ?? "None"}\nSegment signals: ${summary.segmentSignals?.join("; ") ?? "None"}`,
        )
        .join("\n\n");
      const result = await generateStructured({
        requestedModel: "glm_5_2",
        requiresVision: false,
        schema: finalNarrativeSchema,
        system:
          "Write a decision-useful final report from supplied aggregate facts and bounded evidence summaries. Make no tool calls. Never invent or recalculate statistics, quotes, segments, or certainty. Use option positions exactly as supplied. Distinguish strong evidence from weak signals and be candid about synthetic-test limitations.",
        prompt: `QUESTION\n${payload.snapshot.question}\n\nAUDIENCE\n${payload.snapshot.audience}\n\nCONTEXT\n${payload.snapshot.context ?? "No additional context"}\n\nAUTHORITATIVE DETERMINISTIC RESULTS (copy no new numbers)\nOutcome: ${aggregates.outcomeLabel}; strength: ${aggregates.strengthLabel}\n${exactResults}\nConfidence counts: low ${aggregates.confidenceDistribution.low}, medium ${aggregates.confidenceDistribution.medium}, high ${aggregates.confidenceDistribution.high}\n\nHIERARCHICAL EVIDENCE SUMMARIES\n${summaries}\n\nReturn one insight entry for every option position. Recommendations should be concrete changes or follow-up tests, not inflated predictions.`,
        maxOutputTokens: 6_000,
      });
      attempts = result.attempts;
      const positions = new Set(
        payload.options.map((option) => option.position),
      );
      const insightPositions = new Set(
        result.output.optionInsights.map((insight) => insight.optionPosition),
      );
      if (
        result.output.optionInsights.length !== positions.size ||
        insightPositions.size !== positions.size ||
        result.output.optionInsights.some(
          (insight) => !positions.has(insight.optionPosition),
        )
      ) {
        throw new ModelOutputValidationError(
          "Final synthesis did not cover every option",
        );
      }
      await recordAttempts(ctx, {
        testId: payload.test._id,
        ownerId: payload.test.ownerId,
        phase: "synthesis_final",
        workKey,
        attempts,
      });
      await ctx.runMutation(internal.synthesis.finalize, {
        batchId: payload.batch._id,
        narrative: result.output,
        modelKey: result.modelKey,
        provider: result.provider,
      });
      return null;
    } catch (error) {
      const routed = error instanceof RoutedGenerationError ? error : undefined;
      if (routed) attempts = routed.attempts;
      await recordAttempts(ctx, {
        testId: payload.test._id,
        ownerId: payload.test.ownerId,
        phase: "synthesis_final",
        workKey,
        attempts,
      });
      const classified = routed ?? classifyProviderError(error);
      await ctx.runMutation(internal.synthesis.failBatch, {
        batchId: payload.batch._id,
        retryable: routed ? routed.retryable : classified.retryable,
        errorMessage:
          error instanceof Error ? error.message : "Final synthesis failed",
      });
      return null;
    }
  },
});
