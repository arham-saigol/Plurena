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
      { provider: "opencode_go", model: "minimax-m3", resolvedModelKey: "minimax-m3" },
      { provider: "openrouter", model: "minimax/minimax-m3", resolvedModelKey: "minimax-m3" },
    ]);
    expect(routes[2].resolvedModelKey).not.toBe("minimax-m3");
  });
});
