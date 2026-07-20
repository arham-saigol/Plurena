import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import {
  aggregateResponses,
  calculateFailureCreditRefund,
} from "./lib/aggregation";
import { syncDashboardStatsForTest } from "./lib/dashboardStats";
import { ROUTED_GENERATION_LEASE_MS } from "./lib/models";
import { modelKeyValidator, providerValidator } from "./lib/validators";

const SYNTHESIS_GROUP_SIZE = 25;
const FINAL_BATCH_NUMBER = 10_000;
const MAX_SYNTHESIS_ATTEMPTS = 3;

const narrativeValidator = v.object({
  executiveSummary: v.string(),
  winningReasons: v.array(v.string()),
  optionInsights: v.array(
    v.object({
      optionPosition: v.number(),
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
});

async function applyRefund(
  ctx: MutationCtx,
  test: Doc<"tests">,
  refundedCredits: number,
) {
  if (!Number.isFinite(refundedCredits) || refundedCredits <= 0) return 0;
  const externalKey = `test:${test._id}:refund`;
  const existing = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_externalKey", (q) => q.eq("externalKey", externalKey))
    .unique();
  if (existing) return existing.amountCredits;
  const user = await ctx.db.get("users", test.ownerId);
  if (!user) return 0;
  const resultingCreditBalance = user.creditBalance + refundedCredits;
  await ctx.db.patch("users", user._id, {
    creditBalance: resultingCreditBalance,
    updatedAt: Date.now(),
  });
  await ctx.db.insert("ledgerEntries", {
    ownerId: user._id,
    type: "test_refund",
    amountCredits: refundedCredits,
    resultingCreditBalance,
    reason:
      refundedCredits === test.creditCost
        ? "Automatic refund: no usable respondent results"
        : "Automatic refund for failed respondents",
    externalKey,
    testId: test._id,
    createdAt: Date.now(),
  });
  return refundedCredits;
}

function readableReport(
  snapshot: Doc<"testSnapshots">,
  options: Array<Doc<"snapshotOptions">>,
  aggregate: ReturnType<typeof aggregateResponses>,
  narrative: {
    executiveSummary: string;
    winningReasons: Array<string>;
    objections: Array<string>;
    implications: Array<string>;
    nextTests: Array<string>;
    limitations: Array<string>;
  },
) {
  const optionById = new Map(options.map((option) => [option._id, option]));
  const ranking = aggregate.optionResults
    .map((result) => {
      const label = optionById.get(result.optionId)?.label ?? "Unknown option";
      return `${result.rank}. ${label} — ${result.votes} votes (${(result.percentage * 100).toFixed(1)}%)`;
    })
    .join("\n");
  const bullets = (items: Array<string>) =>
    items.length > 0
      ? items.map((item) => `- ${item}`).join("\n")
      : "- None identified";
  return `# ${snapshot.name}\n\n## Executive summary\n${narrative.executiveSummary}\n\n## Outcome\n${aggregate.outcomeLabel} — ${aggregate.strengthLabel}\n\n## Ranked options\n${ranking}\n\n## Why the leading option worked\n${bullets(narrative.winningReasons)}\n\n## Recurring objections\n${bullets(narrative.objections)}\n\n## Messaging implications\n${bullets(narrative.implications)}\n\n## Suggested next tests\n${bullets(narrative.nextTests)}\n\n## Limitations\n${bullets(narrative.limitations)}`;
}

async function scheduleNext(ctx: MutationCtx, testId: Id<"tests">) {
  const batches = await ctx.db
    .query("synthesisBatches")
    .withIndex("by_testId_and_batchNumber", (q) => q.eq("testId", testId))
    .take(30);
  const pendingGroup = batches.find(
    (batch) =>
      batch.batchNumber < FINAL_BATCH_NUMBER && batch.status === "pending",
  );
  if (pendingGroup) {
    await ctx.scheduler.runAfter(0, internal.synthesisActions.summarizeBatch, {
      batchId: pendingGroup._id,
    });
    return;
  }
  const activeGroup = batches.find(
    (batch) =>
      batch.batchNumber < FINAL_BATCH_NUMBER && batch.status === "running",
  );
  if (activeGroup) return;

  const finalBatch = batches.find(
    (batch) => batch.batchNumber === FINAL_BATCH_NUMBER,
  );
  if (!finalBatch) {
    const test = await ctx.db.get("tests", testId);
    if (!test?.snapshotId)
      throw new Error("Snapshot not found for final synthesis");
    const id = await ctx.db.insert("synthesisBatches", {
      testId,
      snapshotId: test.snapshotId,
      ownerId: test.ownerId,
      batchNumber: FINAL_BATCH_NUMBER,
      responseIds: [],
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.synthesisActions.finalizeReport, {
      batchId: id,
    });
    return;
  }
  if (finalBatch.status === "pending") {
    await ctx.scheduler.runAfter(0, internal.synthesisActions.finalizeReport, {
      batchId: finalBatch._id,
    });
  }
}

async function terminallyFailBatch(
  ctx: MutationCtx,
  batch: Doc<"synthesisBatches">,
  errorMessage: string,
) {
  const now = Date.now();
  if (batch.batchNumber === FINAL_BATCH_NUMBER) {
    await ctx.db.patch("synthesisBatches", batch._id, {
      status: "failed",
      leaseExpiresAt: undefined,
      errorMessage: errorMessage.slice(0, 500),
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.synthesis.finalizeFallback, {
      batchId: batch._id,
    });
    return;
  }
  await ctx.db.patch("synthesisBatches", batch._id, {
    status: "failed",
    leaseExpiresAt: undefined,
    summary: "This response group could not be synthesized.",
    themes: [],
    objections: [],
    segmentSignals: [],
    errorMessage: errorMessage.slice(0, 500),
    updatedAt: now,
  });
  await scheduleNext(ctx, batch.testId);
}

export const start = internalMutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const test = await ctx.db.get("tests", args.testId);
    if (!test?.snapshotId || test.status !== "synthesizing") return null;
    const existingReport = await ctx.db
      .query("synthesisReports")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    if (existingReport) return existingReport._id;
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_testId_and_completedAt", (q) => q.eq("testId", test._id))
      .take(300);
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    if (!progress) throw new Error("Test progress not found");
    if (responses.length === 0) {
      const refundedCredits = await applyRefund(
        ctx,
        test,
        test.creditCost ?? 0,
      );
      const now = Date.now();
      await syncDashboardStatsForTest(ctx, test, "failed");
      await ctx.db.patch("tests", test._id, {
        status: "failed",
        completedAt: now,
        updatedAt: now,
      });
      await ctx.db.patch("testProgress", progress._id, {
        status: "failed",
        phaseLabel: `No usable responses — ${refundedCredits > 0 ? "credits refunded" : "test failed"}`,
        updatedAt: now,
      });
      return null;
    }

    const existingBatches = await ctx.db
      .query("synthesisBatches")
      .withIndex("by_testId_and_batchNumber", (q) => q.eq("testId", test._id))
      .take(30);
    if (existingBatches.length === 0) {
      const now = Date.now();
      for (
        let offset = 0;
        offset < responses.length;
        offset += SYNTHESIS_GROUP_SIZE
      ) {
        await ctx.db.insert("synthesisBatches", {
          testId: test._id,
          snapshotId: test.snapshotId,
          ownerId: test.ownerId,
          batchNumber: Math.floor(offset / SYNTHESIS_GROUP_SIZE),
          responseIds: responses
            .slice(offset, offset + SYNTHESIS_GROUP_SIZE)
            .map((response) => response._id),
          status: "pending",
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await scheduleNext(ctx, test._id);
    return null;
  },
});

export const claimBatch = internalMutation({
  args: { batchId: v.id("synthesisBatches") },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("synthesisBatches", args.batchId);
    if (!batch || batch.status === "completed" || batch.status === "failed")
      return false;
    const now = Date.now();
    if (
      batch.status === "running" &&
      batch.leaseExpiresAt !== undefined &&
      batch.leaseExpiresAt > now
    ) {
      return false;
    }
    if (batch.attempts >= MAX_SYNTHESIS_ATTEMPTS) {
      await terminallyFailBatch(
        ctx,
        batch,
        "Synthesis exhausted its retry limit",
      );
      return false;
    }
    const claimToken = batch.attempts + 1;
    await ctx.db.patch("synthesisBatches", batch._id, {
      status: "running",
      attempts: claimToken,
      leaseExpiresAt: now + ROUTED_GENERATION_LEASE_MS,
      updatedAt: now,
    });
    return claimToken;
  },
});

export const getBatchPayload = internalQuery({
  args: {
    batchId: v.id("synthesisBatches"),
    claimToken: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("synthesisBatches", args.batchId);
    if (
      !batch ||
      batch.status !== "running" ||
      batch.attempts !== args.claimToken ||
      batch.batchNumber === FINAL_BATCH_NUMBER
    ) {
      return null;
    }
    const snapshot = await ctx.db.get("testSnapshots", batch.snapshotId);
    if (!snapshot) throw new Error("Snapshot not found");
    const options = await ctx.db
      .query("snapshotOptions")
      .withIndex("by_snapshotId_and_position", (q) =>
        q.eq("snapshotId", snapshot._id),
      )
      .take(10);
    const responses = await Promise.all(
      batch.responseIds.map(async (responseId) => {
        const response = await ctx.db.get("responses", responseId);
        if (!response) return null;
        const persona = await ctx.db.get("personas", response.personaId);
        return persona ? { response, persona } : null;
      }),
    );
    return {
      batch,
      snapshot,
      options,
      responses: responses.filter((row) => row !== null),
    };
  },
});

export const completeBatch = internalMutation({
  args: {
    batchId: v.id("synthesisBatches"),
    claimToken: v.number(),
    summary: v.string(),
    themes: v.array(v.string()),
    objections: v.array(v.string()),
    segmentSignals: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("synthesisBatches", args.batchId);
    if (
      !batch ||
      batch.status !== "running" ||
      batch.attempts !== args.claimToken
    ) {
      return null;
    }
    await ctx.db.patch("synthesisBatches", batch._id, {
      status: "completed",
      leaseExpiresAt: undefined,
      summary: args.summary.slice(0, 3_000),
      themes: args.themes.map((item) => item.slice(0, 500)),
      objections: args.objections.map((item) => item.slice(0, 500)),
      segmentSignals: args.segmentSignals.map((item) => item.slice(0, 500)),
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
    await scheduleNext(ctx, batch.testId);
    return null;
  },
});

export const failBatch = internalMutation({
  args: {
    batchId: v.id("synthesisBatches"),
    claimToken: v.number(),
    retryable: v.boolean(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("synthesisBatches", args.batchId);
    if (
      !batch ||
      batch.status !== "running" ||
      batch.attempts !== args.claimToken
    ) {
      return null;
    }
    const now = Date.now();
    if (args.retryable && batch.attempts < MAX_SYNTHESIS_ATTEMPTS) {
      await ctx.db.patch("synthesisBatches", batch._id, {
        status: "pending",
        leaseExpiresAt: undefined,
        errorMessage: args.errorMessage.slice(0, 500),
        updatedAt: now,
      });
      const fn =
        batch.batchNumber === FINAL_BATCH_NUMBER
          ? internal.synthesisActions.finalizeReport
          : internal.synthesisActions.summarizeBatch;
      await ctx.scheduler.runAfter(2 ** batch.attempts * 2_000, fn, {
        batchId: batch._id,
      });
      return null;
    }
    await terminallyFailBatch(ctx, batch, args.errorMessage);
    return null;
  },
});

export const getFinalPayload = internalQuery({
  args: {
    batchId: v.id("synthesisBatches"),
    claimToken: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("synthesisBatches", args.batchId);
    if (
      !batch ||
      batch.batchNumber !== FINAL_BATCH_NUMBER ||
      batch.status !== "running" ||
      batch.attempts !== args.claimToken
    ) {
      return null;
    }
    const snapshot = await ctx.db.get("testSnapshots", batch.snapshotId);
    const test = await ctx.db.get("tests", batch.testId);
    if (!snapshot || !test) throw new Error("Final synthesis input is missing");
    const options = await ctx.db
      .query("snapshotOptions")
      .withIndex("by_snapshotId_and_position", (q) =>
        q.eq("snapshotId", snapshot._id),
      )
      .take(10);
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_testId_and_completedAt", (q) => q.eq("testId", test._id))
      .take(300);
    const summaries = await ctx.db
      .query("synthesisBatches")
      .withIndex("by_testId_and_batchNumber", (q) => q.eq("testId", test._id))
      .take(30);
    return {
      batch,
      test,
      snapshot,
      options,
      responses,
      summaries: summaries
        .filter((item) => item.batchNumber < FINAL_BATCH_NUMBER)
        .map((item) => ({
          summary: item.summary,
          themes: item.themes,
          objections: item.objections,
          segmentSignals: item.segmentSignals,
          failed: item.status === "failed",
        })),
    };
  },
});

export const finalize = internalMutation({
  args: {
    batchId: v.id("synthesisBatches"),
    claimToken: v.union(v.number(), v.null()),
    narrative: narrativeValidator,
    modelKey: v.optional(modelKeyValidator),
    provider: v.optional(providerValidator),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("synthesisBatches", args.batchId);
    if (!batch || batch.batchNumber !== FINAL_BATCH_NUMBER) return null;
    if (
      args.claimToken !== null &&
      (batch.status !== "running" || batch.attempts !== args.claimToken)
    ) {
      return null;
    }
    const existing = await ctx.db
      .query("synthesisReports")
      .withIndex("by_testId", (q) => q.eq("testId", batch.testId))
      .unique();
    if (existing) return existing._id;
    const test = await ctx.db.get("tests", batch.testId);
    const snapshot = await ctx.db.get("testSnapshots", batch.snapshotId);
    if (!test || !snapshot) throw new Error("Final synthesis input is missing");
    const options = await ctx.db
      .query("snapshotOptions")
      .withIndex("by_snapshotId_and_position", (q) =>
        q.eq("snapshotId", snapshot._id),
      )
      .take(10);
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_testId_and_completedAt", (q) => q.eq("testId", test._id))
      .take(300);
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    if (!progress) throw new Error("Test progress not found");
    const aggregate = aggregateResponses(options, responses);
    const refundedCredits = calculateFailureCreditRefund(
      snapshot.chargedCredits,
      responses.length,
      progress.failedRespondents,
    );
    const appliedRefund = await applyRefund(ctx, test, refundedCredits);
    const insightByPosition = new Map(
      args.narrative.optionInsights.map((insight) => [
        insight.optionPosition,
        insight,
      ]),
    );
    const optionInsights = options.map((option) => {
      const insight = insightByPosition.get(option.position);
      return {
        optionId: option._id,
        strengths: insight?.strengths ?? [],
        weaknesses: insight?.weaknesses ?? [],
        recommendations: insight?.recommendations ?? [],
      };
    });
    const limitations = [
      ...args.narrative.limitations,
      "Synthetic respondents provide directional evidence, not a guarantee of real-world behavior.",
      ...(progress.failedRespondents > 0
        ? [
            `${progress.failedRespondents} respondents failed after retries and were excluded from percentages.`,
          ]
        : []),
    ];
    const now = Date.now();
    const reportId = await ctx.db.insert("synthesisReports", {
      testId: test._id,
      snapshotId: snapshot._id,
      ownerId: test.ownerId,
      executiveSummary: args.narrative.executiveSummary,
      winningOptionId: aggregate.winningOptionId,
      outcomeLabel: aggregate.outcomeLabel,
      strengthLabel: aggregate.strengthLabel,
      optionResults: aggregate.optionResults.map((result) => ({
        optionId: result.optionId,
        rank: result.rank,
        votes: result.votes,
        percentage: result.percentage,
        averageConfidence: result.averageConfidence,
      })),
      confidenceDistribution: aggregate.confidenceDistribution,
      winningReasons: args.narrative.winningReasons,
      optionInsights,
      objections: args.narrative.objections,
      segments: args.narrative.segments,
      disagreements: args.narrative.disagreements,
      implications: args.narrative.implications,
      nextTests: args.narrative.nextTests,
      limitations,
      readableReport: readableReport(snapshot, options, aggregate, {
        ...args.narrative,
        limitations,
      }),
      successfulResponses: responses.length,
      failedResponses: progress.failedRespondents,
      refundedCredits: appliedRefund,
      modelKey: args.modelKey,
      provider: args.provider,
      createdAt: now,
    });
    const finalStatus =
      progress.failedRespondents > 0 ? "partially_failed" : "completed";
    await ctx.db.patch("synthesisBatches", batch._id, {
      status: "completed",
      leaseExpiresAt: undefined,
      updatedAt: now,
    });
    await syncDashboardStatsForTest(ctx, test, finalStatus);
    await ctx.db.patch("tests", test._id, {
      status: finalStatus,
      completedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("testProgress", progress._id, {
      status: finalStatus,
      phaseLabel:
        finalStatus === "completed"
          ? "Report ready"
          : "Report ready with partial results",
      runningRespondents: 0,
      updatedAt: now,
    });
    return reportId;
  },
});

export const finalizeFallback = internalMutation({
  args: { batchId: v.id("synthesisBatches") },
  handler: async (ctx, args): Promise<Id<"synthesisReports"> | null> => {
    const batch = await ctx.db.get("synthesisBatches", args.batchId);
    if (!batch || batch.batchNumber !== FINAL_BATCH_NUMBER) return null;
    const options = await ctx.db
      .query("snapshotOptions")
      .withIndex("by_snapshotId_and_position", (q) =>
        q.eq("snapshotId", batch.snapshotId),
      )
      .take(10);
    const reportId: Id<"synthesisReports"> | null = await ctx.runMutation(
      internal.synthesis.finalize,
      {
        batchId: batch._id,
        claimToken: null,
        narrative: {
          executiveSummary:
            "The respondent-level results are available, but the narrative synthesis could not be completed after provider retries. The rankings and percentages below are calculated directly from stored responses.",
          winningReasons: [],
          optionInsights: options.map((option) => ({
            optionPosition: option.position,
            strengths: [],
            weaknesses: [],
            recommendations: [
              "Review the individual respondent reasons before iterating this option.",
            ],
          })),
          objections: [],
          segments: [],
          disagreements: [],
          implications: [
            "Treat the deterministic vote result as directional and inspect individual responses.",
          ],
          nextTests: [
            "Retry a focused follow-up test after reviewing respondent-level evidence.",
          ],
          limitations: [
            "Narrative synthesis was unavailable; no synthesized themes were invented.",
          ],
        },
      },
    );
    return reportId;
  },
});

export const reclaimStaleBatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("synthesisBatches")
      .withIndex("by_status_and_leaseExpiresAt", (q) =>
        q.eq("status", "running").lt("leaseExpiresAt", now),
      )
      .take(20);
    for (const batch of stale) {
      if (batch.attempts >= MAX_SYNTHESIS_ATTEMPTS) {
        await terminallyFailBatch(
          ctx,
          batch,
          "Worker lease expired after the final synthesis attempt",
        );
        continue;
      }
      await ctx.db.patch("synthesisBatches", batch._id, {
        status: "pending",
        leaseExpiresAt: undefined,
        errorMessage: "Worker lease expired; retrying",
        updatedAt: now,
      });
      const fn =
        batch.batchNumber === FINAL_BATCH_NUMBER
          ? internal.synthesisActions.finalizeReport
          : internal.synthesisActions.summarizeBatch;
      await ctx.scheduler.runAfter(0, fn, { batchId: batch._id });
    }
    return stale.length;
  },
});
