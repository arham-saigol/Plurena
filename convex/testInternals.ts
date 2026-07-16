import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { aggregateComparison, aggregateOpenEnded } from "./lib/aggregation";
import { applyCreditEntry } from "./lib/credits";

const synthesize = internal.jobs.synthesize;
const runRespondent = internal.jobs.runRespondent;

export const loadAssignment = internalQuery({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) return null;
    const [test, persona, allOptions] = await Promise.all([
      ctx.db.get(assignment.testId),
      ctx.db.get(assignment.personaId),
      ctx.db.query("options").withIndex("by_test", (q) => q.eq("testId", assignment.testId)).collect(),
    ]);
    if (!test || !persona) return null;
    const optionMap = new Map(allOptions.map((option) => [String(option._id), option]));
    const options = await Promise.all(assignment.shuffledOptionIds.map(async (id: any) => {
      const option = optionMap.get(String(id));
      if (!option) return null;
      return { ...option, imageUrl: option.storageId ? await ctx.storage.getUrl(option.storageId) : undefined };
    }));
    return { assignment, test, persona, options: options.filter(Boolean) };
  },
});

export const startAssignment = internalMutation({
  args: { assignmentId: v.id("assignments"), leaseToken: v.string() },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.status === "completed" || assignment.status === "failed") return false;
    const now = Date.now();
    if (assignment.status === "running" && (assignment.leaseExpiresAt ?? 0) > now) return false;
    if (assignment.attemptCount >= 2) {
      await ctx.db.patch(assignment._id, { status: "failed", completedAt: now, leaseToken: undefined, leaseExpiresAt: undefined });
      await updateTestProgress(ctx, assignment.testId, assignment.status, "failed");
      return false;
    }
    const leaseExpiresAt = now + 8 * 60 * 1_000;
    await ctx.db.patch(args.assignmentId, { status: "running", attemptCount: assignment.attemptCount + 1, leaseToken: args.leaseToken, leaseExpiresAt });
    const test = await ctx.db.get(assignment.testId);
    if (test?.status === "queued") await ctx.db.patch(test._id, { status: "running" });
    await ctx.scheduler.runAfter(8 * 60 * 1_000 + 1_000, internal.testInternals.recoverAssignment, { assignmentId: assignment._id, leaseToken: args.leaseToken });
    return true;
  },
});

export const recoverAssignment = internalMutation({
  args: { assignmentId: v.id("assignments"), leaseToken: v.string() },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.status !== "running" || assignment.leaseToken !== args.leaseToken || (assignment.leaseExpiresAt ?? 0) > Date.now()) return;
    if (assignment.attemptCount >= 2) {
      await ctx.db.patch(assignment._id, { status: "failed", completedAt: Date.now(), leaseToken: undefined, leaseExpiresAt: undefined });
      await updateTestProgress(ctx, assignment.testId, assignment.status, "failed");
      return;
    }
    await ctx.db.patch(assignment._id, { status: "queued", leaseToken: undefined, leaseExpiresAt: undefined });
    await ctx.scheduler.runAfter(0, runRespondent, { assignmentId: assignment._id });
  },
});

export const recordAttempt = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => await ctx.db.insert("modelAttempts", { ...args, createdAt: Date.now() }),
});

export const finishAssignment = internalMutation({
  args: {
    assignmentId: v.id("assignments"),
    leaseToken: v.string(),
    choiceOptionId: v.optional(v.id("options")),
    answer: v.optional(v.string()),
    feedback: v.array(v.string()),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) return { duplicate: true };
    const existing = await ctx.db.query("responses").withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId)).unique();
    if (existing || assignment.status === "completed") return { duplicate: true };
    if (assignment.status !== "running" || assignment.leaseToken !== args.leaseToken || (assignment.leaseExpiresAt ?? 0) <= Date.now()) return { duplicate: true };
    const now = Date.now();
    await ctx.db.insert("responses", {
      testId: assignment.testId,
      userId: assignment.userId,
      assignmentId: assignment._id,
      personaId: assignment.personaId,
      choiceOptionId: args.choiceOptionId,
      answer: args.answer,
      feedback: args.feedback,
      provider: args.provider,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd: args.estimatedCostUsd,
      latencyMs: args.latencyMs,
      createdAt: now,
    });
    await ctx.db.patch(assignment._id, { status: "completed", completedAt: now, leaseToken: undefined, leaseExpiresAt: undefined });
    await updateTestProgress(ctx, assignment.testId, assignment.status, "completed");
    return { duplicate: false };
  },
});

export const failAssignment = internalMutation({
  args: { assignmentId: v.id("assignments"), leaseToken: v.string() },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.status === "completed" || assignment.status === "failed" || assignment.leaseToken !== args.leaseToken || (assignment.leaseExpiresAt ?? 0) <= Date.now()) return;
    await ctx.db.patch(assignment._id, { status: "failed", completedAt: Date.now(), leaseToken: undefined, leaseExpiresAt: undefined });
    await updateTestProgress(ctx, assignment.testId, assignment.status, "failed");
  },
});

async function updateTestProgress(
  ctx: MutationCtx,
  testId: Id<"tests">,
  previousStatus: Doc<"assignments">["status"],
  nextStatus: Doc<"assignments">["status"],
) {
  const test = await ctx.db.get(testId);
  if (!test || ["completed", "partial", "failed", "synthesizing"].includes(test.status)) return;
  const completedCount = test.completedCount - Number(previousStatus === "completed") + Number(nextStatus === "completed");
  const failedCount = test.failedCount - Number(previousStatus === "failed") + Number(nextStatus === "failed");
  const totalAssignmentCount = test.panelSize;
  const terminal = completedCount + failedCount === totalAssignmentCount;
  await ctx.db.patch(test._id, { completedCount, failedCount, status: terminal ? "synthesizing" : "running" });
  if (terminal) await ctx.scheduler.runAfter(0, synthesize, { testId });
}

export const aggregate = internalMutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const test = await ctx.db.get(args.testId);
    if (!test) return null;
    const existing = await ctx.db.query("aggregates").withIndex("by_test", (q) => q.eq("testId", args.testId)).unique();
    const [options, responses] = await Promise.all([
      ctx.db.query("options").withIndex("by_test", (q) => q.eq("testId", args.testId)).collect(),
      ctx.db.query("responses").withIndex("by_test", (q) => q.eq("testId", args.testId)).collect(),
    ]);
    const orderedOptions = options.sort((a, b) => a.position - b.position);
    const normalized = responses.map((item) => ({ choiceOptionId: item.choiceOptionId ? String(item.choiceOptionId) : undefined, answer: item.answer, feedback: item.feedback }));
    const data = test.testType === "compare" ? aggregateComparison(orderedOptions.map((item) => String(item._id)), normalized) : aggregateOpenEnded(normalized);
    if (!existing) {
      await ctx.db.insert("aggregates", { testId: test._id, userId: test.userId, kind: test.testType === "compare" ? "comparison" : "open_ended", data, responseCount: responses.length, generatedAt: Date.now() });
    }
    return { test, options: orderedOptions, responses, data };
  },
});

export const recordSynthesisAttempt = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => await ctx.db.insert("synthesisAttempts", { ...args, createdAt: Date.now() }),
});

export const beginSynthesis = internalMutation({
  args: { testId: v.id("tests"), leaseToken: v.string() },
  handler: async (ctx, args) => {
    const test = await ctx.db.get(args.testId);
    if (!test || test.status !== "synthesizing") return false;
    if (test.synthesisLeaseExpiresAt && test.synthesisLeaseExpiresAt > Date.now()) return false;
    await ctx.db.patch(test._id, { synthesisLeaseToken: args.leaseToken, synthesisLeaseExpiresAt: Date.now() + 10 * 60 * 1_000 });
    return true;
  },
});

export const saveSynthesis = internalMutation({
  args: {
    testId: v.id("tests"),
    leaseToken: v.string(),
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
    evidenceResponseCount: v.number(),
    omittedResponseCount: v.number(),
  },
  handler: async (ctx, args) => {
    const test = await ctx.db.get(args.testId);
    if (!test || test.synthesisLeaseToken !== args.leaseToken) return;
    const existing = await ctx.db.query("syntheses").withIndex("by_test", (q) => q.eq("testId", args.testId)).unique();
    if (!existing) await ctx.db.insert("syntheses", {
      testId: args.testId,
      userId: test.userId,
      summary: args.summary,
      patterns: args.patterns,
      disagreements: args.disagreements,
      nextActions: args.nextActions,
      directness: args.directness,
      rhythm: args.rhythm,
      trust: args.trust,
      authenticity: args.authenticity,
      density: args.density,
      provider: args.provider,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd: args.estimatedCostUsd,
      latencyMs: args.latencyMs,
      evidenceResponseCount: args.evidenceResponseCount,
      omittedResponseCount: args.omittedResponseCount,
      createdAt: Date.now(),
    });
    const status = test.completedCount > 0 ? (test.failedCount > 0 ? "partial" : "completed") : "failed";
    if (status === "failed") {
      const idempotencyKey = `test:${test._id}:refund`;
      const existingRefund = await ctx.db.query("creditLedger").withIndex("by_user_idempotency", (q) =>
        q.eq("userId", test.userId).eq("idempotencyKey", idempotencyKey),
      ).unique();
      if (!existingRefund) {
        const user = await ctx.db.get(test.userId);
        if (user) {
          const balanceCents = applyCreditEntry(
            { balanceCents: user.balanceCents, appliedKeys: new Set<string>() },
            idempotencyKey,
            test.priceCents,
          ).balanceCents;
          const now = Date.now();
          await ctx.db.insert("creditLedger", {
            userId: test.userId,
            amountCents: test.priceCents,
            balanceAfterCents: balanceCents,
            kind: "test_refund",
            idempotencyKey,
            testId: test._id,
            note: "No usable panel responses",
            createdAt: now,
          });
          await ctx.db.patch(user._id, { balanceCents, updatedAt: now });
        }
      }
    }
    await ctx.db.patch(test._id, { status, completedAt: test.completedAt ?? Date.now(), synthesisLeaseToken: undefined, synthesisLeaseExpiresAt: undefined });
  },
});
