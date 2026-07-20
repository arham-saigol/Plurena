import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    OPENROUTER_API_KEY: v.optional(v.string()),
    OPENCODE_GO_API_KEY: v.optional(v.string()),
    CREEM_API_KEY: v.optional(v.string()),
    CREEM_WEBHOOK_SECRET: v.optional(v.string()),
    CREEM_PRODUCT_ID_10: v.optional(v.string()),
    CREEM_PRODUCT_ID_25: v.optional(v.string()),
    CREEM_PRODUCT_ID_50: v.optional(v.string()),
    CREEM_PRODUCT_ID_100: v.optional(v.string()),
    CREEM_PRODUCT_ID_200: v.optional(v.string()),
    CREEM_PRODUCT_ID_400: v.optional(v.string()),
    CREEM_API_BASE_URL: v.optional(v.string()),
    APP_URL: v.optional(v.string()),
  },
});
