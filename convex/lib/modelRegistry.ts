export type ProviderName = "opencode_go" | "openrouter";
export type ModelRoute = { provider: ProviderName; model: string };
export type ModelDefinition = { key: string; label: string; vision: boolean; routes: ModelRoute[] };

export const MODEL_REGISTRY: readonly ModelDefinition[] = [
  { key: "minimax-m3", label: "Minimax M3", vision: true, routes: [{ provider: "opencode_go", model: "minimax-m3" }, { provider: "openrouter", model: "minimax/minimax-m3" }] },
  { key: "glm-5.2", label: "GLM 5.2", vision: false, routes: [{ provider: "opencode_go", model: "glm-5.2" }, { provider: "openrouter", model: "z-ai/glm-5.2" }] },
  { key: "deepseek-v4-pro", label: "Deepseek V4 Pro", vision: false, routes: [{ provider: "opencode_go", model: "deepseek-v4-pro" }, { provider: "openrouter", model: "deepseek/deepseek-v4-pro" }] },
  { key: "deepseek-v4-flash", label: "Deepseek V4 Flash", vision: false, routes: [{ provider: "opencode_go", model: "deepseek-v4-flash" }, { provider: "openrouter", model: "deepseek/deepseek-v4-flash" }] },
  { key: "kimi-k2.6", label: "Kimi K2.6", vision: true, routes: [{ provider: "opencode_go", model: "kimi-k2.6" }, { provider: "openrouter", model: "moonshotai/kimi-k2.6" }] },
  { key: "kimi-k2.7-code", label: "Kimi K2.7 Code", vision: true, routes: [{ provider: "opencode_go", model: "kimi-k2.7-code" }, { provider: "openrouter", model: "moonshotai/kimi-k2.7-code" }] },
  { key: "qwen3.7-plus", label: "Qwen3.7 Plus", vision: true, routes: [{ provider: "opencode_go", model: "qwen3.7-plus" }, { provider: "openrouter", model: "qwen/qwen3.7-plus" }] },
  { key: "mimo-v2.5", label: "MiMo V2.5", vision: true, routes: [{ provider: "opencode_go", model: "mimo-v2.5" }, { provider: "openrouter", model: "xiaomi/mimo-v2.5" }] },
  { key: "hy3", label: "Hy3", vision: false, routes: [{ provider: "openrouter", model: "tencent/hy3:free" }, { provider: "openrouter", model: "tencent/hy3" }] },
  { key: "step-3.7-flash", label: "Step 3.7 Flash", vision: true, routes: [{ provider: "openrouter", model: "stepfun/step-3.7-flash" }] },
] as const;

export function modelForAssignment(ordinal: number, needsVision: boolean) {
  const eligible = needsVision ? MODEL_REGISTRY.filter((model) => model.vision) : MODEL_REGISTRY;
  return eligible[ordinal % eligible.length];
}

export function routesWithCrossModelFallback(modelKey: string, needsVision: boolean) {
  const eligible = needsVision ? MODEL_REGISTRY.filter((item) => item.vision) : MODEL_REGISTRY;
  const primary = eligible.find((item) => item.key === modelKey) ?? eligible[0];
  const backup = eligible.find((item) => item.key !== primary.key);
  return [
    ...primary.routes.map((route) => ({ ...route, resolvedModelKey: primary.key })),
    ...(backup?.routes.map((route) => ({ ...route, resolvedModelKey: backup.key })) ?? []),
  ];
}
