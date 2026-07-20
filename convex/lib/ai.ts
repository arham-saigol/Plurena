"use node";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output, type ModelMessage } from "ai";
import type { z } from "zod";
import { env } from "../_generated/server";
import {
  classifyProviderError,
  getModelRoutes,
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
  if (route.provider === "openrouter") {
    if (!env.OPENROUTER_API_KEY) {
      throw new ProviderNotConfiguredError(
        "OPENROUTER_API_KEY is not configured",
      );
    }
    const provider = createOpenAICompatible({
      name: "openrouter",
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      supportsStructuredOutputs: true,
      headers: {
        "HTTP-Referer": env.APP_URL ?? "https://plurena.app",
        "X-Title": "Plurena",
      },
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
}: {
  requestedModel: ModelKey;
  requiresVision: boolean;
  schema: z.ZodType<T>;
  system: string;
  prompt?: string;
  messages?: Array<ModelMessage>;
  maxOutputTokens?: number;
}) {
  const attempts: Array<ProviderAttempt> = [];
  const routes = getModelRoutes(requestedModel, requiresVision);
  let lastError: unknown;

  for (const route of routes) {
    const startedAt = Date.now();
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
            abortSignal: AbortSignal.timeout(MODEL_ROUTE_TIMEOUT_MS),
          })
        : await generateText({
            model,
            output,
            system,
            prompt: prompt ?? "Produce the requested structured output.",
            maxOutputTokens,
            temperature: 0.35,
            maxRetries: 1,
            abortSignal: AbortSignal.timeout(MODEL_ROUTE_TIMEOUT_MS),
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
      lastError = error;
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
      const classified = classifyProviderError(error);
      attempts.push({
        modelKey: route.modelKey,
        provider: route.provider,
        status: "failed",
        errorClass: classified.classification,
        latencyMs: Date.now() - startedAt,
      });
      if (!classified.retryable) {
        throw new RoutedGenerationError(
          "The model request could not be completed",
          attempts,
          classified.classification,
          false,
        );
      }
    }
  }

  const classified =
    lastError instanceof ProviderNotConfiguredError
      ? { classification: "configuration" as const, retryable: false }
      : classifyProviderError(lastError);
  throw new RoutedGenerationError(
    "All eligible model routes were temporarily unavailable",
    attempts,
    classified.classification,
    classified.retryable,
  );
}
