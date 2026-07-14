import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const audience = v.object({
  name: v.optional(v.string()),
  locations: v.array(v.string()),
  description: v.string(),
  gender: v.union(v.literal("female"), v.literal("mixed"), v.literal("male")),
  minAge: v.number(),
  maxAge: v.number(),
});

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    balanceCents: v.number(),
    onboardingClaimedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]).index("by_token", ["tokenIdentifier"]),

  accountDeletionRequests: defineTable({
    clerkId: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  promotionDailyUsage: defineTable({
    day: v.string(),
    claimCount: v.number(),
    amountCents: v.number(),
    updatedAt: v.number(),
  }).index("by_day", ["day"]),

  onboardingAnswers: defineTable({
    userId: v.id("users"),
    goals: v.array(v.string()),
    integrationPlans: v.array(v.string()),
    submittedAt: v.number(),
  }).index("by_user", ["userId"]),

  creditLedger: defineTable({
    userId: v.id("users"),
    amountCents: v.number(),
    balanceAfterCents: v.number(),
    kind: v.union(
      v.literal("onboarding_bonus"),
      v.literal("top_up"),
      v.literal("test_charge"),
      v.literal("test_refund"),
    ),
    idempotencyKey: v.string(),
    testId: v.optional(v.id("tests")),
    paymentId: v.optional(v.id("payments")),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_idempotency", ["userId", "idempotencyKey"]),

  payments: defineTable({
    userId: v.id("users"),
    requestId: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    creemCheckoutId: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    checkoutClaimedAt: v.optional(v.number()),
    checkoutClaimToken: v.optional(v.string()),
    checkoutAttemptCount: v.optional(v.number()),
    lastCheckoutAttemptAt: v.optional(v.number()),
    creemOrderId: v.optional(v.string()),
    creemCustomerId: v.optional(v.string()),
    eventId: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_request", ["requestId"])
    .index("by_event", ["eventId"])
    .index("by_user_created", ["userId", "createdAt"]),

  savedAudiences: defineTable({
    userId: v.id("users"),
    name: v.string(),
    criteria: audience,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  uploadGrants: defineTable({
    userId: v.id("users"),
    status: v.union(v.literal("issued"), v.literal("registered")),
    createdAt: v.number(),
    registeredAt: v.optional(v.number()),
  }).index("by_user_created", ["userId", "createdAt"]),

  assets: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    uploadGrantId: v.id("uploadGrants"),
    contentType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_storage", ["storageId"]).index("by_created", ["createdAt"]),

  tests: defineTable({
    userId: v.id("users"),
    clientRequestId: v.string(),
    inputFingerprint: v.string(),
    title: v.string(),
    testType: v.union(v.literal("compare"), v.literal("question")),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("partial"),
      v.literal("failed"),
    ),
    audience,
    panelSize: v.number(),
    priceCents: v.number(),
    priceVersion: v.string(),
    completedCount: v.number(),
    failedCount: v.number(),
    rerunOf: v.optional(v.id("tests")),
    reusedPanel: v.boolean(),
    launchedAt: v.number(),
    completedAt: v.optional(v.number()),
    synthesisLeaseToken: v.optional(v.string()),
    synthesisLeaseExpiresAt: v.optional(v.number()),
  })
    .index("by_user_created", ["userId", "launchedAt"])
    .index("by_user_request", ["userId", "clientRequestId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_type_created", ["userId", "testType", "launchedAt"])
    .index("by_user_status_created", ["userId", "status", "launchedAt"])
    .index("by_user_type_status_created", ["userId", "testType", "status", "launchedAt"])
    .index("by_status_launched", ["status", "launchedAt"]),

  options: defineTable({
    testId: v.id("tests"),
    userId: v.id("users"),
    label: v.string(),
    optionType: v.union(v.literal("text"), v.literal("image")),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    position: v.number(),
  }).index("by_test", ["testId"]).index("by_storage", ["storageId"]).index("by_user", ["userId"]),

  personas: defineTable({
    testId: v.id("tests"),
    userId: v.id("users"),
    ordinal: v.number(),
    age: v.number(),
    location: v.string(),
    gender: v.union(v.literal("female"), v.literal("male"), v.literal("nonbinary")),
    interests: v.array(v.string()),
    habits: v.array(v.string()),
    constraints: v.array(v.string()),
    pointOfView: v.string(),
    sourcePersonaId: v.optional(v.id("personas")),
  }).index("by_test", ["testId"]).index("by_user", ["userId"]),

  assignments: defineTable({
    testId: v.id("tests"),
    userId: v.id("users"),
    personaId: v.id("personas"),
    ordinal: v.number(),
    shuffledOptionIds: v.array(v.id("options")),
    modelKey: v.string(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    attemptCount: v.number(),
    leaseToken: v.optional(v.string()),
    leaseExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_test", ["testId"])
    .index("by_user", ["userId"])
    .index("by_test_status", ["testId", "status"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_status_lease", ["status", "leaseExpiresAt"]),

  responses: defineTable({
    testId: v.id("tests"),
    userId: v.id("users"),
    assignmentId: v.id("assignments"),
    personaId: v.id("personas"),
    choiceOptionId: v.optional(v.id("options")),
    answer: v.optional(v.string()),
    feedback: v.array(v.string()),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    latencyMs: v.number(),
    createdAt: v.number(),
  }).index("by_test", ["testId"]).index("by_assignment", ["assignmentId"]).index("by_user", ["userId"]),

  modelAttempts: defineTable({
    testId: v.id("tests"),
    assignmentId: v.id("assignments"),
    provider: v.string(),
    model: v.string(),
    attempt: v.number(),
    status: v.union(v.literal("started"), v.literal("succeeded"), v.literal("retryable_error"), v.literal("failed")),
    httpStatus: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_assignment", ["assignmentId"]),

  synthesisAttempts: defineTable({
    testId: v.id("tests"),
    provider: v.string(),
    model: v.string(),
    attempt: v.number(),
    status: v.union(v.literal("succeeded"), v.literal("retryable_error"), v.literal("failed")),
    httpStatus: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_test", ["testId"]),

  aggregates: defineTable({
    testId: v.id("tests"),
    userId: v.id("users"),
    kind: v.union(v.literal("comparison"), v.literal("open_ended")),
    data: v.any(),
    responseCount: v.number(),
    generatedAt: v.number(),
  }).index("by_test", ["testId"]).index("by_user", ["userId"]),

  syntheses: defineTable({
    testId: v.id("tests"),
    userId: v.id("users"),
    summary: v.string(),
    patterns: v.array(v.string()),
    disagreements: v.array(v.string()),
    nextActions: v.array(v.string()),
    directness: v.number(),
    rhythm: v.number(),
    trust: v.number(),
    authenticity: v.number(),
    density: v.number(),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    evidenceResponseCount: v.optional(v.number()),
    omittedResponseCount: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_test", ["testId"]).index("by_user", ["userId"]),
});
