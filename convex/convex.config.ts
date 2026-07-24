import aggregate from "@convex-dev/aggregate/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    AI_GATEWAY_API_KEY: v.optional(v.string()),
    OPENCODE_GO_API_KEY: v.optional(v.string()),
    STEPFUN_API_KEY: v.optional(v.string()),
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

app.use(aggregate, { name: "ledgerAggregate" });

export default app;
