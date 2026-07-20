export const MODEL_CATALOG = {
  minimax_m3: {
    label: "MiniMax M3",
    vision: true,
    routes: [
      {
        provider: "opencode_go",
        protocol: "anthropic",
        modelId: "minimax-m3",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "minimax/minimax-m3",
      },
    ],
  },
  glm_5_2: {
    label: "GLM 5.2",
    vision: false,
    routes: [
      {
        provider: "opencode_go",
        protocol: "openai",
        modelId: "glm-5.2",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "z-ai/glm-5.2",
      },
    ],
  },
  deepseek_v4_pro: {
    label: "DeepSeek V4 Pro",
    vision: false,
    routes: [
      {
        provider: "opencode_go",
        protocol: "openai",
        modelId: "deepseek-v4-pro",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "deepseek/deepseek-v4-pro",
      },
    ],
  },
  deepseek_v4_flash: {
    label: "DeepSeek V4 Flash",
    vision: false,
    routes: [
      {
        provider: "opencode_go",
        protocol: "openai",
        modelId: "deepseek-v4-flash",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "deepseek/deepseek-v4-flash",
      },
    ],
  },
  kimi_k2_6: {
    label: "Kimi K2.6",
    vision: true,
    routes: [
      {
        provider: "opencode_go",
        protocol: "openai",
        modelId: "kimi-k2.6",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "moonshotai/kimi-k2.6",
      },
    ],
  },
  kimi_k2_7_code: {
    label: "Kimi K2.7 Code",
    vision: true,
    routes: [
      {
        provider: "opencode_go",
        protocol: "openai",
        modelId: "kimi-k2.7-code",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "moonshotai/kimi-k2.7-code",
      },
    ],
  },
  qwen3_7_plus: {
    label: "Qwen3.7 Plus",
    vision: true,
    routes: [
      {
        provider: "opencode_go",
        protocol: "openai",
        modelId: "qwen3.7-plus",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "qwen/qwen3.7-plus",
      },
    ],
  },
  mimo_v2_5: {
    label: "MiMo V2.5",
    vision: true,
    routes: [
      {
        provider: "opencode_go",
        protocol: "openai",
        modelId: "mimo-v2.5",
      },
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "xiaomi/mimo-v2.5",
      },
    ],
  },
  hy3: {
    label: "Hy3",
    vision: false,
    routes: [
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "tencent/hy3",
      },
    ],
  },
  step_3_7_flash: {
    label: "Step 3.7 Flash",
    vision: true,
    routes: [
      {
        provider: "openrouter",
        protocol: "openai",
        modelId: "stepfun/step-3.7-flash",
      },
    ],
  },
} as const;

export const MODEL_ROUTE_TIMEOUT_MS = 60_000;
// Leave ample action headroom to record failures and schedule retries.
export const ROUTED_GENERATION_DEADLINE_MS = 6 * 60_000;
export const ROUTED_GENERATION_LEASE_MS =
  ROUTED_GENERATION_DEADLINE_MS + 2 * 60_000;

export type ModelKey = keyof typeof MODEL_CATALOG;
export type ProviderKey = "opencode_go" | "openrouter";
export type ProviderProtocol = "openai" | "anthropic";

export const MODEL_KEYS = Object.keys(MODEL_CATALOG) as Array<ModelKey>;

const textFallbackOrder: Array<ModelKey> = [
  "glm_5_2",
  "deepseek_v4_pro",
  "deepseek_v4_flash",
  "hy3",
];

const visionFallbackOrder: Array<ModelKey> = [
  "minimax_m3",
  "kimi_k2_6",
  "qwen3_7_plus",
  "mimo_v2_5",
  "step_3_7_flash",
  "kimi_k2_7_code",
];

export function isModelKey(value: string): value is ModelKey {
  return Object.hasOwn(MODEL_CATALOG, value);
}

export function getModel(modelKey: ModelKey) {
  return MODEL_CATALOG[modelKey];
}

export function getModelRoutes(
  requestedModel: ModelKey,
  requiresVision: boolean,
) {
  const order = [
    requestedModel,
    ...(requiresVision ? visionFallbackOrder : textFallbackOrder),
    ...MODEL_KEYS,
  ];
  const seenModels = new Set<ModelKey>();
  const seenRoutes = new Set<string>();

  return order.flatMap((modelKey) => {
    if (seenModels.has(modelKey)) return [];
    seenModels.add(modelKey);
    const model = MODEL_CATALOG[modelKey];
    if (requiresVision && !model.vision) return [];
    return model.routes.flatMap((route) => {
      const key = `${route.provider}:${route.modelId}`;
      if (seenRoutes.has(key)) return [];
      seenRoutes.add(key);
      return [{ modelKey, ...route }];
    });
  });
}

export type ProviderErrorClass =
  | "configuration"
  | "timeout"
  | "rate_limit"
  | "provider_unavailable"
  | "network"
  | "authentication"
  | "invalid_request"
  | "schema"
  | "unknown";

export class ModelOutputValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStatus(error: unknown) {
  if (!isRecord(error)) return undefined;
  const value = error.statusCode ?? error.status;
  return typeof value === "number" ? value : undefined;
}

export function classifyProviderError(error: unknown): {
  classification: ProviderErrorClass;
  retryable: boolean;
} {
  const status = readStatus(error);
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (error instanceof ModelOutputValidationError) {
    return { classification: "schema", retryable: true };
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return { classification: "timeout", retryable: true };
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return { classification: "timeout", retryable: true };
  }
  if (status === 401 || status === 403) {
    return { classification: "authentication", retryable: false };
  }
  if (status === 429) {
    return { classification: "rate_limit", retryable: true };
  }
  if (status !== undefined && status >= 500) {
    return { classification: "provider_unavailable", retryable: true };
  }
  if (status !== undefined && status >= 400) {
    return { classification: "invalid_request", retryable: false };
  }
  if (
    message.includes("schema") ||
    message.includes("validation") ||
    message.includes("parse")
  ) {
    return { classification: "schema", retryable: false };
  }
  if (error instanceof TypeError) {
    return { classification: "network", retryable: true };
  }
  return { classification: "unknown", retryable: false };
}
