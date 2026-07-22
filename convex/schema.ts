import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  confidenceValidator,
  creditOptionKeyValidator,
  dashboardBucketValidator,
  errorClassValidator,
  familiarityValidator,
  ledgerTypeValidator,
  modelKeyValidator,
  optionTypeValidator,
  providerAttemptStatusValidator,
  providerValidator,
  respondentCountValidator,
  respondentWorkStatusValidator,
  testStatusValidator,
  workStatusValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    subject: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    creditBalance: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_subject", ["subject"]),

  tests: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    question: v.string(),
    optionType: optionTypeValidator,
    audience: v.string(),
    context: v.optional(v.string()),
    respondentCount: respondentCountValidator,
    status: testStatusValidator,
    dashboardBucket: dashboardBucketValidator,
    snapshotId: v.optional(v.id("testSnapshots")),
    creditCost: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    launchedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"]),

  dashboardStats: defineTable({
    ownerId: v.id("users"),
    active: v.number(),
    completed: v.number(),
    updatedAt: v.number(),
  }).index("by_ownerId", ["ownerId"]),

  testProgress: defineTable({
    testId: v.id("tests"),
    ownerId: v.id("users"),
    status: testStatusValidator,
    phaseLabel: v.string(),
    totalRespondents: v.number(),
    personaCount: v.number(),
    completedRespondents: v.number(),
    failedRespondents: v.number(),
    runningRespondents: v.number(),
    updatedAt: v.number(),
  })
    .index("by_testId", ["testId"])
    .index("by_ownerId_and_status", ["ownerId", "status"]),

  uploadedAssets: defineTable({
    ownerId: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"])
    .index("by_storageId", ["storageId"])
    .index("by_expiresAt", ["expiresAt"]),

  maintenanceSweeps: defineTable({
    name: v.string(),
    afterCreationTime: v.number(),
    cursor: v.optional(v.string()),
    cutoff: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  testOptions: defineTable({
    testId: v.id("tests"),
    ownerId: v.id("users"),
    position: v.number(),
    label: v.string(),
    text: v.optional(v.string()),
    assetId: v.optional(v.id("uploadedAssets")),
    storageId: v.optional(v.id("_storage")),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_testId_and_position", ["testId", "position"])
    .index("by_ownerId_and_testId", ["ownerId", "testId"])
    .index("by_ownerId_and_storageId", ["ownerId", "storageId"]),

  testSnapshots: defineTable({
    testId: v.id("tests"),
    ownerId: v.id("users"),
    name: v.string(),
    question: v.string(),
    optionType: optionTypeValidator,
    audience: v.string(),
    context: v.optional(v.string()),
    respondentCount: respondentCountValidator,
    personaModel: modelKeyValidator,
    synthesisModel: modelKeyValidator,
    chargedCredits: v.number(),
    createdAt: v.number(),
  })
    .index("by_testId", ["testId"])
    .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"]),

  snapshotOptions: defineTable({
    snapshotId: v.id("testSnapshots"),
    testId: v.id("tests"),
    ownerId: v.id("users"),
    originalOptionId: v.id("testOptions"),
    position: v.number(),
    label: v.string(),
    text: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
  })
    .index("by_snapshotId_and_position", ["snapshotId", "position"])
    .index("by_testId_and_position", ["testId", "position"]),

  personaBatches: defineTable({
    testId: v.id("tests"),
    snapshotId: v.id("testSnapshots"),
    ownerId: v.id("users"),
    batchNumber: v.number(),
    requestedCount: v.number(),
    startIndex: v.number(),
    status: workStatusValidator,
    attempts: v.number(),
    leaseExpiresAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_testId_and_batchNumber", ["testId", "batchNumber"])
    .index("by_status_and_leaseExpiresAt", ["status", "leaseExpiresAt"]),

  personas: defineTable({
    testId: v.id("tests"),
    snapshotId: v.id("testSnapshots"),
    ownerId: v.id("users"),
    batchId: v.id("personaBatches"),
    respondentKey: v.string(),
    displayName: v.string(),
    background: v.string(),
    goals: v.array(v.string()),
    motivations: v.array(v.string()),
    frustrations: v.array(v.string()),
    decisionDrivers: v.array(v.string()),
    familiarity: familiarityValidator,
    behavioralTraits: v.array(v.string()),
    reasoningStyle: v.string(),
    priceSensitivity: v.string(),
    soul: v.string(),
    uniquenessFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index("by_testId_and_respondentKey", ["testId", "respondentKey"])
    .index("by_snapshotId", ["snapshotId"])
    .index("by_batchId", ["batchId"]),

  respondentRuns: defineTable({
    testId: v.id("tests"),
    snapshotId: v.id("testSnapshots"),
    ownerId: v.id("users"),
    personaId: v.id("personas"),
    modelKey: modelKeyValidator,
    status: respondentWorkStatusValidator,
    attempts: v.number(),
    leaseExpiresAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorClass: v.optional(errorClassValidator),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_testId_and_status", ["testId", "status"])
    .index("by_testId_and_personaId", ["testId", "personaId"])
    .index("by_status_and_leaseExpiresAt", ["status", "leaseExpiresAt"]),

  responses: defineTable({
    testId: v.id("tests"),
    snapshotId: v.id("testSnapshots"),
    ownerId: v.id("users"),
    runId: v.id("respondentRuns"),
    personaId: v.id("personas"),
    selectedOptionId: v.id("snapshotOptions"),
    reasons: v.array(v.string()),
    comparisons: v.array(v.string()),
    objection: v.optional(v.string()),
    confidence: confidenceValidator,
    confidenceScore: v.number(),
    modelKey: modelKeyValidator,
    provider: providerValidator,
    startedAt: v.number(),
    completedAt: v.number(),
  })
    .index("by_testId_and_completedAt", ["testId", "completedAt"])
    .index("by_testId_and_selectedOptionId", ["testId", "selectedOptionId"])
    .index("by_runId", ["runId"]),

  synthesisBatches: defineTable({
    testId: v.id("tests"),
    snapshotId: v.id("testSnapshots"),
    ownerId: v.id("users"),
    batchNumber: v.number(),
    responseIds: v.array(v.id("responses")),
    status: workStatusValidator,
    attempts: v.number(),
    leaseExpiresAt: v.optional(v.number()),
    summary: v.optional(v.string()),
    themes: v.optional(v.array(v.string())),
    objections: v.optional(v.array(v.string())),
    segmentSignals: v.optional(v.array(v.string())),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_testId_and_batchNumber", ["testId", "batchNumber"])
    .index("by_status_and_leaseExpiresAt", ["status", "leaseExpiresAt"]),

  synthesisReports: defineTable({
    testId: v.id("tests"),
    snapshotId: v.id("testSnapshots"),
    ownerId: v.id("users"),
    executiveSummary: v.string(),
    winningOptionId: v.optional(v.id("snapshotOptions")),
    outcomeLabel: v.string(),
    strengthLabel: v.string(),
    optionResults: v.array(
      v.object({
        optionId: v.id("snapshotOptions"),
        rank: v.number(),
        votes: v.number(),
        percentage: v.number(),
        averageConfidence: v.number(),
      }),
    ),
    confidenceDistribution: v.object({
      low: v.number(),
      medium: v.number(),
      high: v.number(),
    }),
    winningReasons: v.array(v.string()),
    optionInsights: v.array(
      v.object({
        optionId: v.id("snapshotOptions"),
        strengths: v.array(v.string()),
        weaknesses: v.array(v.string()),
        recommendations: v.array(v.string()),
      }),
    ),
    objections: v.array(v.string()),
    segments: v.array(
      v.object({
        name: v.string(),
        pattern: v.string(),
        evidence: v.string(),
      }),
    ),
    disagreements: v.array(v.string()),
    implications: v.array(v.string()),
    nextTests: v.array(v.string()),
    limitations: v.array(v.string()),
    readableReport: v.string(),
    successfulResponses: v.number(),
    failedResponses: v.number(),
    refundedCredits: v.number(),
    modelKey: v.optional(modelKeyValidator),
    provider: v.optional(providerValidator),
    createdAt: v.number(),
  })
    .index("by_testId", ["testId"])
    .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"]),

  providerAttempts: defineTable({
    testId: v.id("tests"),
    ownerId: v.id("users"),
    phase: v.string(),
    workKey: v.string(),
    modelKey: modelKeyValidator,
    provider: providerValidator,
    status: providerAttemptStatusValidator,
    errorClass: v.optional(errorClassValidator),
    latencyMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_testId_and_createdAt", ["testId", "createdAt"])
    .index("by_workKey_and_createdAt", ["workKey", "createdAt"]),

  checkoutSessions: defineTable({
    ownerId: v.id("users"),
    requestId: v.string(),
    optionKey: creditOptionKeyValidator,
    productId: v.string(),
    priceCents: v.number(),
    credits: v.number(),
    status: v.union(
      v.literal("creating"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("partially_refunded"),
      v.literal("refunded"),
      v.literal("disputed"),
    ),
    checkoutId: v.optional(v.string()),
    orderId: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    refundedAmountCents: v.number(),
    knownRefundedAmountCents: v.number(),
    reversedCredits: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requestId", ["requestId"])
    .index("by_checkoutId", ["checkoutId"])
    .index("by_orderId", ["orderId"])
    .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"]),

  webhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("processed"),
      v.literal("ignored"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  }).index("by_eventId", ["eventId"]),

  ledgerEntries: defineTable({
    ownerId: v.id("users"),
    type: ledgerTypeValidator,
    amountCredits: v.number(),
    resultingCreditBalance: v.number(),
    reason: v.string(),
    externalKey: v.string(),
    testId: v.optional(v.id("tests")),
    checkoutId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_ownerId_and_createdAt", ["ownerId", "createdAt"])
    .index("by_externalKey", ["externalKey"]),
});
