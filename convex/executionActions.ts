"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import {
  generateStructured,
  RoutedGenerationError,
  type ProviderAttempt,
} from "./lib/ai";
import { classifyProviderError } from "./lib/models";
import {
  personaBatchSchema,
  respondentResultSchema,
  type PersonaOutput,
} from "./lib/structuredSchemas";

type PersonaBatchPayload = {
  batch: Doc<"personaBatches">;
  snapshot: Doc<"testSnapshots">;
  existingPersonas: Array<
    Pick<Doc<"personas">, "displayName" | "background" | "soul">
  >;
};

type RespondentPayload = {
  run: Doc<"respondentRuns">;
  snapshot: Doc<"testSnapshots">;
  persona: Doc<"personas">;
  options: Array<Doc<"snapshotOptions">>;
};

async function fingerprintPersona(persona: PersonaOutput) {
  const source = `${persona.displayName}|${persona.background}|${persona.soul}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

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

export const generatePersonaBatch = internalAction({
  args: { batchId: v.id("personaBatches") },
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(
      internal.execution.claimPersonaBatch,
      args,
    );
    if (!claimed) return null;
    const payload: PersonaBatchPayload | null = await ctx.runQuery(
      internal.execution.getPersonaBatchPayload,
      args,
    );
    if (!payload) return null;
    const workKey = `persona-batch:${payload.batch._id}`;
    let attempts: Array<ProviderAttempt> = [];
    try {
      const previous = payload.existingPersonas
        .map(
          (persona) =>
            `- ${persona.displayName}: ${persona.background} Internal perspective: ${persona.soul}`,
        )
        .join("\n");
      const result = await generateStructured({
        requestedModel: "glm_5_2",
        requiresVision: false,
        schema: personaBatchSchema,
        system:
          "You design rigorous synthetic research panels. Make no tool calls. Create plausible, distinct perspectives inside the stated audience without stereotypes, invented sensitive traits, or demographic assumptions that are not justified by the brief. Each persona must have a coherent point of view that can materially change a marketing judgment. Return only the requested structured output.",
        prompt: `Create exactly ${payload.batch.requestedCount} new respondent personas for a marketing test.\n\nAudience definition:\n${payload.snapshot.audience}\n\nProduct or situation context:\n${payload.snapshot.context ?? "No additional context was supplied."}\n\nThis is batch ${payload.batch.batchNumber + 1}; respondent numbers ${payload.batch.startIndex + 1} through ${payload.batch.startIndex + payload.batch.requestedCount}.\n\nAlready-created panelists (do not copy their labels, backgrounds, or viewpoints):\n${previous || "None yet."}\n\nVary needs, category familiarity, decision styles, objections, and price sensitivity while staying inside the audience definition. displayName should be a short neutral research label, not a stereotyped personal identity. soul must be a concise first-person internal perspective.`,
        maxOutputTokens: 8_000,
      });
      attempts = result.attempts;
      if (result.output.personas.length !== payload.batch.requestedCount) {
        throw new Error("The model returned the wrong persona count");
      }
      const personas = await Promise.all(
        result.output.personas.map(async (persona) => ({
          ...persona,
          uniquenessFingerprint: await fingerprintPersona(persona),
        })),
      );
      if (
        new Set(personas.map((persona) => persona.uniquenessFingerprint))
          .size !== personas.length
      ) {
        throw new Error("The model returned duplicate personas");
      }
      await recordAttempts(ctx, {
        testId: payload.batch.testId,
        ownerId: payload.batch.ownerId,
        phase: "persona_generation",
        workKey,
        attempts,
      });
      await ctx.runMutation(internal.execution.completePersonaBatch, {
        batchId: payload.batch._id,
        personas,
      });
      return null;
    } catch (error) {
      const routed = error instanceof RoutedGenerationError ? error : undefined;
      if (routed) attempts = routed.attempts;
      await recordAttempts(ctx, {
        testId: payload.batch.testId,
        ownerId: payload.batch.ownerId,
        phase: "persona_generation",
        workKey,
        attempts,
      });
      const classified = routed ?? classifyProviderError(error);
      await ctx.runMutation(internal.execution.failPersonaBatch, {
        batchId: payload.batch._id,
        retryable: routed
          ? routed.retryable
          : classified.classification === "schema",
        errorMessage:
          error instanceof Error ? error.message : "Persona generation failed",
      });
      return null;
    }
  },
});

export const runRespondent = internalAction({
  args: { runId: v.id("respondentRuns") },
  handler: async (ctx, args) => {
    const payload: RespondentPayload | null = await ctx.runQuery(
      internal.execution.getRespondentPayload,
      args,
    );
    if (!payload) return null;
    const startedAt = Date.now();
    const workKey = `respondent-run:${payload.run._id}`;
    let attempts: Array<ProviderAttempt> = [];
    try {
      const optionText = payload.options
        .map((option) =>
          option.text
            ? `Option ${option.position}: ${option.label}\n${option.text}`
            : `Option ${option.position}: ${option.label} (image attached in this position)`,
        )
        .join("\n\n");
      const personaText = `Research label: ${payload.persona.displayName}\nBackground: ${payload.persona.background}\nGoals: ${payload.persona.goals.join("; ")}\nMotivations: ${payload.persona.motivations.join("; ")}\nFrustrations and objections: ${payload.persona.frustrations.join("; ")}\nDecision drivers: ${payload.persona.decisionDrivers.join("; ")}\nCategory familiarity: ${payload.persona.familiarity}\nBehavioral traits: ${payload.persona.behavioralTraits.join("; ")}\nReasoning style: ${payload.persona.reasoningStyle}\nPrice sensitivity: ${payload.persona.priceSensitivity}\nInternal perspective: ${payload.persona.soul}`;
      const instruction = `Embody this respondent consistently and independently. Judge every option from this persona's perspective. Give concise user-facing conclusions, not private chain-of-thought. Select the zero-based option position exactly as shown.\n\nPERSONA\n${personaText}\n\nTEST QUESTION\n${payload.snapshot.question}\n\nCONTEXT\n${payload.snapshot.context ?? "No additional context was supplied."}\n\nOPTIONS\n${optionText}`;

      const imageParts: Array<{
        type: "file";
        data: Uint8Array;
        mediaType: string;
        filename?: string;
      }> = [];
      if (payload.snapshot.optionType === "image") {
        for (const option of payload.options) {
          if (!option.storageId || !option.contentType) {
            throw new Error("An image option is missing its stored file");
          }
          const blob = await ctx.storage.get(option.storageId);
          if (!blob) throw new Error("An image option could not be loaded");
          imageParts.push({
            type: "file",
            data: new Uint8Array(await blob.arrayBuffer()),
            mediaType: option.contentType,
            filename: option.filename,
          });
        }
      }

      const result = await generateStructured({
        requestedModel: payload.snapshot.respondentModel,
        requiresVision: payload.snapshot.optionType === "image",
        schema: respondentResultSchema,
        system:
          "You are one respondent in a synthetic audience study. Make no tool calls. Stay inside the supplied persona, evaluate all options, and return concise research conclusions rather than hidden reasoning.",
        prompt: imageParts.length === 0 ? instruction : undefined,
        messages:
          imageParts.length > 0
            ? [
                {
                  role: "user",
                  content: [{ type: "text", text: instruction }, ...imageParts],
                },
              ]
            : undefined,
        maxOutputTokens: 1_800,
      });
      attempts = result.attempts;
      const selectedOption = payload.options.find(
        (option) => option.position === result.output.selectedOptionPosition,
      );
      if (!selectedOption)
        throw new Error("Model selected an invalid option position");
      await recordAttempts(ctx, {
        testId: payload.run.testId,
        ownerId: payload.run.ownerId,
        phase: "respondent",
        workKey,
        attempts,
      });
      await ctx.runMutation(internal.execution.completeRespondent, {
        runId: payload.run._id,
        selectedOptionId: selectedOption._id,
        reasons: result.output.reasons,
        comparisons: result.output.comparisons,
        objection: result.output.objection ?? undefined,
        confidence: result.output.confidence,
        confidenceScore: result.output.confidenceScore,
        modelKey: result.modelKey,
        provider: result.provider,
        startedAt,
      });
      return null;
    } catch (error) {
      const routed = error instanceof RoutedGenerationError ? error : undefined;
      if (routed) attempts = routed.attempts;
      await recordAttempts(ctx, {
        testId: payload.run.testId,
        ownerId: payload.run.ownerId,
        phase: "respondent",
        workKey,
        attempts,
      });
      const classified = routed ?? classifyProviderError(error);
      await ctx.runMutation(internal.execution.failRespondent, {
        runId: payload.run._id,
        retryable: routed ? routed.retryable : classified.retryable,
        errorClass: routed ? routed.classification : classified.classification,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Respondent execution failed",
      });
      return null;
    }
  },
});
