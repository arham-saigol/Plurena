import { query } from "./_generated/server";
import { MODEL_REGISTRY } from "./lib/modelRegistry";

export const list = query({ args: {}, handler: async () => MODEL_REGISTRY.map(({ routes, ...model }) => ({ ...model, providerCount: new Set(routes.map((route) => route.provider)).size })) });
