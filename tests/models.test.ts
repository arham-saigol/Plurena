import { describe, expect, it } from "vitest";
import { MODEL_REGISTRY, modelForAssignment, routesWithCrossModelFallback } from "@/convex/lib/modelRegistry";

describe("model registry", () => {
  it("matches the ten configured model families", () => expect(MODEL_REGISTRY).toHaveLength(10));
  it("uses only vision models for image assignments", () => {
    for (let index = 0; index < 30; index += 1) expect(modelForAssignment(index, true).vision).toBe(true);
  });
  it("tries the named primary and fallback before another model", () => {
    const routes = routesWithCrossModelFallback("minimax-m3", false);
    expect(routes.slice(0, 2)).toEqual([
      { provider: "opencode_go", model: "minimax-m3", protocol: "anthropic_messages", resolvedModelKey: "minimax-m3" },
      { provider: "openrouter", model: "minimax/minimax-m3", protocol: "openai_chat_completions", resolvedModelKey: "minimax-m3" },
    ]);
    expect(routes[2].resolvedModelKey).not.toBe("minimax-m3");
  });

  it("uses the protocol documented for every OpenCode Go model", () => {
    const protocols = Object.fromEntries(MODEL_REGISTRY.flatMap((model) => model.routes
      .filter((route) => route.provider === "opencode_go")
      .map((route) => [route.model, route.protocol])));

    expect(protocols).toMatchObject({
      "minimax-m3": "anthropic_messages",
      "qwen3.7-plus": "anthropic_messages",
      "glm-5.2": "openai_chat_completions",
      "kimi-k2.7-code": "openai_chat_completions",
      "kimi-k2.6": "openai_chat_completions",
      "deepseek-v4-pro": "openai_chat_completions",
      "deepseek-v4-flash": "openai_chat_completions",
      "mimo-v2.5": "openai_chat_completions",
    });
  });
});
