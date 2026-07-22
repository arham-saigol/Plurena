"use node";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  generateText,
  NoObjectGeneratedError,
  Output,
  type ModelMessage,
} from "ai";
import type { z } from "zod";
import { env } from "../_generated/server";
import {
  classifyProviderError,
  getModelRoutes,
  ModelOutputValidationError,
  ROUTED_GENERATION_DEADLINE_MS,
  MODEL_ROUTE_TIMEOUT_MS,
  type ModelKey,
  type ProviderErrorClass,
  type ProviderKey,
} from "./models";

export type ProviderAttempt = {
  modelKey: ModelKey;
  provider: ProviderKey;
  status: "succeeded" | "failed";
  errorClass?: ProviderErrorClass;
  latencyMs: number;
};

export class RoutedGenerationError extends Error {
  attempts: Array<ProviderAttempt>;
  classification: ProviderErrorClass;
  retryable: boolean;

  constructor(
    message: string,
    attempts: Array<ProviderAttempt>,
    classification: ProviderErrorClass,
    retryable: boolean,
  ) {
    super(message);
    this.name = "RoutedGenerationError";
    this.attempts = attempts;
    this.classification = classification;
    this.retryable = retryable;
  }
}

class ProviderNotConfiguredError extends Error {}

function providerModel(route: ReturnType<typeof getModelRoutes>[number]) {
  if (route.provider === "ai_gateway") {
    if (!env.AI_GATEWAY_API_KEY) {
      throw new ProviderNotConfiguredError(
        "AI_GATEWAY_API_KEY is not configured",
      );
    }
    const provider = createGateway({
      apiKey: env.AI_GATEWAY_API_KEY,
    });
    return provider(route.modelId);
  }

  if (route.provider === "stepfun") {
    if (!env.STEPFUN_API_KEY) {
      throw new ProviderNotConfiguredError("STEPFUN_API_KEY is not configured");
    }
    const provider = createOpenAICompatible({
      name: "stepfun",
      apiKey: env.STEPFUN_API_KEY,
      baseURL: "https://api.stepfun.ai/v1",
      supportsStructuredOutputs: true,
    });
    return provider(route.modelId);
  }

  if (!env.OPENCODE_GO_API_KEY) {
    throw new ProviderNotConfiguredError(
      "OPENCODE_GO_API_KEY is not configured",
    );
  }
  if (route.protocol === "anthropic") {
    const provider = createAnthropic({
      apiKey: env.OPENCODE_GO_API_KEY,
      baseURL: "https://opencode.ai/zen/go/v1",
      name: "opencode-go",
    });
    return provider(route.modelId);
  }
  const provider = createOpenAICompatible({
    name: "opencode-go",
    apiKey: env.OPENCODE_GO_API_KEY,
    baseURL: "https://opencode.ai/zen/go/v1",
    supportsStructuredOutputs: true,
  });
  return provider(route.modelId);
}

export async function generateStructured<T>({
  requestedModel,
  requiresVision,
  schema,
  system,
  prompt,
  messages,
  maxOutputTokens = 4_000,
  deadlineAt = Date.now() + ROUTED_GENERATION_DEADLINE_MS,
}: {
  requestedModel: ModelKey;
  requiresVision: boolean;
  schema: z.ZodType<T>;
  system: string;
  prompt?: string;
  messages?: Array<ModelMessage>;
  maxOutputTokens?: number;
  deadlineAt?: number;
}) {
  const attempts: Array<ProviderAttempt> = [];
  const routes = getModelRoutes(requestedModel, requiresVision);
  let lastAttemptedFailure:
    { classification: ProviderErrorClass; retryable: boolean } | undefined;
  let lastRetryableFailure:
    { classification: ProviderErrorClass; retryable: boolean } | undefined;

  for (const route of routes) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) {
      lastAttemptedFailure = { classification: "timeout", retryable: true };
      lastRetryableFailure = lastAttemptedFailure;
      break;
    }
    const startedAt = Date.now();
    const abortSignal = AbortSignal.timeout(
      Math.min(MODEL_ROUTE_TIMEOUT_MS, remainingMs),
    );
    try {
      const model = providerModel(route);
      const output = Output.object({ schema });
      const result = messages
        ? await generateText({
            model,
            output,
            system,
            messages,
            maxOutputTokens,
            temperature: 0.35,
            maxRetries: 1,
            abortSignal,
          })
        : await generateText({
            model,
            output,
            system,
            prompt: prompt ?? "Produce the requested structured output.",
            maxOutputTokens,
            temperature: 0.35,
            maxRetries: 1,
            abortSignal,
          });
      attempts.push({
        modelKey: route.modelKey,
        provider: route.provider,
        status: "succeeded",
        latencyMs: Date.now() - startedAt,
      });
      return {
        output: result.output,
        modelKey: route.modelKey,
        provider: route.provider,
        attempts,
      };
    } catch (error) {
      if (error instanceof ProviderNotConfiguredError) {
        attempts.push({
          modelKey: route.modelKey,
          provider: route.provider,
          status: "failed",
          errorClass: "configuration",
          latencyMs: Date.now() - startedAt,
        });
        continue;
      }
      const classified = classifyProviderError(
        NoObjectGeneratedError.isInstance(error)
          ? new ModelOutputValidationError(error.message)
          : error,
      );
      lastAttemptedFailure = classified;
      if (classified.retryable) {
        lastRetryableFailure = { ...classified, retryable: true };
      }
      attempts.push({
        modelKey: route.modelKey,
        provider: route.provider,
        status: "failed",
        errorClass: classified.classification,
        latencyMs: Date.now() - startedAt,
      });
      if (
        !classified.retryable &&
        classified.classification !== "authentication"
      ) {
        throw new RoutedGenerationError(
          "The model request could not be completed",
          attempts,
          classified.classification,
          false,
        );
      }
    }
  }

  const classified = lastRetryableFailure ??
    lastAttemptedFailure ?? {
      classification: "configuration" as const,
      retryable: false,
    };
  throw new RoutedGenerationError(
    "All eligible model routes were temporarily unavailable",
    attempts,
    classified.classification,
    classified.retryable,
  );
}
