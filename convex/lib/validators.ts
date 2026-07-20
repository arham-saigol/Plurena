import { v } from "convex/values";
import { MODEL_KEYS } from "./models";

export const respondentCountValidator = v.union(
  v.literal(20),
  v.literal(50),
  v.literal(75),
  v.literal(100),
  v.literal(150),
  v.literal(200),
  v.literal(250),
);

export const modelKeyValidator = v.union(
  ...MODEL_KEYS.map((key) => v.literal(key)),
);

export const optionTypeValidator = v.union(
  v.literal("text"),
  v.literal("image"),
);

export const testStatusValidator = v.union(
  v.literal("draft"),
  v.literal("preparing_personas"),
  v.literal("running_respondents"),
  v.literal("synthesizing"),
  v.literal("completed"),
  v.literal("partially_failed"),
  v.literal("failed"),
);

export const dashboardBucketValidator = v.union(
  v.literal("ignored"),
  v.literal("active"),
  v.literal("completed"),
);

export const workStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

export const respondentWorkStatusValidator = v.union(
  v.literal("pending"),
  v.literal("retrying"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

export const confidenceValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

export const familiarityValidator = v.union(
  v.literal("unfamiliar"),
  v.literal("aware"),
  v.literal("considering"),
  v.literal("experienced"),
  v.literal("expert"),
);

export const ledgerTypeValidator = v.union(
  v.literal("onboarding_bonus"),
  v.literal("top_up"),
  v.literal("test_charge"),
  v.literal("test_refund"),
  v.literal("adjustment"),
);

export const providerValidator = v.union(
  v.literal("opencode_go"),
  v.literal("openrouter"),
);

export const providerAttemptStatusValidator = v.union(
  v.literal("succeeded"),
  v.literal("failed"),
);

export const errorClassValidator = v.union(
  v.literal("configuration"),
  v.literal("timeout"),
  v.literal("rate_limit"),
  v.literal("provider_unavailable"),
  v.literal("network"),
  v.literal("authentication"),
  v.literal("invalid_request"),
  v.literal("schema"),
  v.literal("unknown"),
);

export const optionInputValidator = v.union(
  v.object({
    kind: v.literal("text"),
    label: v.string(),
    text: v.string(),
  }),
  v.object({
    kind: v.literal("image"),
    label: v.string(),
    assetId: v.id("uploadedAssets"),
  }),
);
