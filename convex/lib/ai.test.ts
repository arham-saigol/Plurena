import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  env: {
    OPENCODE_GO_API_KEY: "opencode-test" as string | undefined,
    OPENROUTER_API_KEY: "openrouter-test" as string | undefined,
    APP_URL: undefined as string | undefined,
  },
  generateText: vi.fn(),
}));

vi.mock("../_generated/server", () => ({ env: mocks.env }));
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ modelId }))),
}));
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: vi.fn(() =>
    vi.fn((modelId: string) => ({ modelId })),
  ),
}));
vi.mock("ai", () => ({
  generateText: mocks.generateText,
  Output: { object: vi.fn(() => ({})) },
}));

import { generateStructured, RoutedGenerationError } from "./ai";

const request = {
  requestedModel: "glm_5_2" as const,
  requiresVision: false,
  schema: z.object({ answer: z.string() }),
  system: "Answer the request.",
  prompt: "Test prompt",
};

describe("routed generation failures", () => {
  beforeEach(() => {
    mocks.generateText.mockReset();
    mocks.env.OPENCODE_GO_API_KEY = "opencode-test";
    mocks.env.OPENROUTER_API_KEY = "openrouter-test";
  });

  it("tries a backup provider after provider authentication fails", async () => {
    mocks.generateText
      .mockRejectedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ output: { answer: "fallback" } });

    const result = await generateStructured(request);

    expect(result).toMatchObject({
      output: { answer: "fallback" },
      provider: "openrouter",
    });
    expect(
      result.attempts.map(({ provider, errorClass }) => ({
        provider,
        errorClass,
      })),
    ).toEqual([
      { provider: "opencode_go", errorClass: "authentication" },
      { provider: "openrouter", errorClass: undefined },
    ]);
  });

  it("preserves transient retryability when unconfigured routes are skipped", async () => {
    mocks.env.OPENROUTER_API_KEY = undefined;
    mocks.generateText.mockRejectedValue({ status: 429 });

    const error = await generateStructured(request).catch((caught) => caught);

    expect(error).toBeInstanceOf(RoutedGenerationError);
    expect(error).toMatchObject({
      classification: "rate_limit",
      retryable: true,
    });
  });

  it("preserves transient retryability across later authentication failures", async () => {
    mocks.generateText
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValue({ status: 401 });

    const error = await generateStructured(request).catch((caught) => caught);

    expect(error).toBeInstanceOf(RoutedGenerationError);
    expect(error).toMatchObject({
      classification: "rate_limit",
      retryable: true,
    });
  });

  it("fails as retryable timeout before routing when the deadline has expired", async () => {
    const error = await generateStructured({
      ...request,
      deadlineAt: Date.now() - 1,
    }).catch((caught) => caught);

    expect(error).toBeInstanceOf(RoutedGenerationError);
    expect(error).toMatchObject({
      classification: "timeout",
      retryable: true,
    });
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("still fails promptly for request-wide invalid inputs", async () => {
    mocks.generateText.mockRejectedValue({ status: 400 });

    const error = await generateStructured(request).catch((caught) => caught);

    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({
      classification: "invalid_request",
      retryable: false,
    });
  });
});
