import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import {
  confidenceValidator,
  errorClassValidator,
  familiarityValidator,
  modelKeyValidator,
  providerAttemptStatusValidator,
  providerValidator,
} from "./lib/validators";
import { syncDashboardStatsForTest } from "./lib/dashboardStats";
import {
  getRespondentModels,
  ROUTED_GENERATION_LEASE_MS,
  type ProviderErrorClass,
} from "./lib/models";

const PERSONA_BATCH_SIZE = 20;
const RESPONDENT_CONCURRENCY = 5;
const STALE_RESPONDENT_BATCH_SIZE = 50;
const MAX_WORK_ATTEMPTS = 3;

const personaDataValidator = v.object({
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
});

const attemptValidator = v.object({
  modelKey: modelKeyValidator,
  provider: providerValidator,
  status: providerAttemptStatusValidator,
  errorClass: v.optional(errorClassValidator),
  latencyMs: v.number(),
});

async function fullRefund(
  ctx: MutationCtx,
  testId: Id<"tests">,
  reason: string,
) {
  const test = await ctx.db.get("tests", testId);
  if (!test?.snapshotId || !test.creditCost) return 0;
  const refundKey = `test:${testId}:refund`;
  const existing = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_externalKey", (q) => q.eq("externalKey", refundKey))
    .unique();
  if (existing) return existing.amountCredits;
  const user = await ctx.db.get("users", test.ownerId);
  if (!user) return 0;
  const resultingCreditBalance = user.creditBalance + test.creditCost;
  await ctx.db.patch("users", user._id, {
    creditBalance: resultingCreditBalance,
    updatedAt: Date.now(),
  });
  await ctx.db.insert("ledgerEntries", {
    ownerId: user._id,
    type: "test_refund",
    amountCredits: test.creditCost,
    resultingCreditBalance,
    reason,
    externalKey: refundKey,
    testId,
    createdAt: Date.now(),
  });
  return test.creditCost;
}

async function terminallyFailPersonaBatch(
  ctx: MutationCtx,
  batch: Doc<"personaBatches">,
  errorMessage: string,
) {
  const now = Date.now();
  await ctx.db.patch("personaBatches", batch._id, {
    status: "failed",
    leaseExpiresAt: undefined,
    errorMessage: errorMessage.slice(0, 500),
    updatedAt: now,
  });
  const test = await ctx.db.get("tests", batch.testId);
  if (test) {
    await syncDashboardStatsForTest(ctx, test, "failed");
    await ctx.db.patch("tests", test._id, {
      status: "failed",
      completedAt: now,
      updatedAt: now,
    });
  }
  const progress = await ctx.db
    .query("testProgress")
    .withIndex("by_testId", (q) => q.eq("testId", batch.testId))
    .unique();
  if (progress) {
    await ctx.db.patch("testProgress", progress._id, {
      status: "failed",
      phaseLabel: "Could not build a valid audience — charge refunded",
      updatedAt: now,
    });
  }
  await fullRefund(
    ctx,
    batch.testId,
    "Automatic refund: audience generation failed",
  );
}

async function terminallyFailRespondent(
  ctx: MutationCtx,
  run: Doc<"respondentRuns">,
  errorClass: ProviderErrorClass,
  errorMessage: string,
) {
  const now = Date.now();
  await ctx.db.patch("respondentRuns", run._id, {
    status: "failed",
    leaseExpiresAt: undefined,
    completedAt: now,
    errorClass,
    errorMessage: errorMessage.slice(0, 500),
    updatedAt: now,
  });
  const progress = await ctx.db
    .query("testProgress")
    .withIndex("by_testId", (q) => q.eq("testId", run.testId))
    .unique();
  if (progress) {
    await ctx.db.patch("testProgress", progress._id, {
      failedRespondents: progress.failedRespondents + 1,
      runningRespondents:
        run.status === "running"
          ? Math.max(0, progress.runningRespondents - 1)
          : progress.runningRespondents,
      updatedAt: now,
    });
  }
  await ctx.scheduler.runAfter(0, internal.execution.dispatchRespondents, {
    testId: run.testId,
  });
}

export const claimPersonaBatch = internalMutation({
  args: { batchId: v.id("personaBatches") },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("personaBatches", args.batchId);
    if (!batch || batch.status === "completed" || batch.status === "failed") {
      return false;
    }
    const now = Date.now();
    if (
      batch.status === "running" &&
      batch.leaseExpiresAt !== undefined &&
      batch.leaseExpiresAt > now
    ) {
      return false;
    }
    if (batch.attempts >= MAX_WORK_ATTEMPTS) {
      await terminallyFailPersonaBatch(
        ctx,
        batch,
        "Persona generation exhausted its retry limit",
      );
      return false;
    }
    const claimToken = batch.attempts + 1;
    await ctx.db.patch("personaBatches", batch._id, {
      status: "running",
      attempts: claimToken,
      leaseExpiresAt: now + ROUTED_GENERATION_LEASE_MS,
      updatedAt: now,
    });
    return claimToken;
  },
});

export const getPersonaBatchPayload = internalQuery({
  args: {
    batchId: v.id("personaBatches"),
    claimToken: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("personaBatches", args.batchId);
    if (
      !batch ||
      batch.status !== "running" ||
      batch.attempts !== args.claimToken
    ) {
      return null;
    }
    const snapshot = await ctx.db.get("testSnapshots", batch.snapshotId);
    if (!snapshot) throw new Error("Test snapshot not found");
    const existingPersonas = await ctx.db
      .query("personas")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", snapshot._id))
      .take(300);
    return {
      batch,
      snapshot,
      existingPersonas: existingPersonas.map((persona) => ({
        displayName: persona.displayName,
        background: persona.background,
        soul: persona.soul,
      })),
    };
  },
});

export const recordProviderAttempts = internalMutation({
  args: {
    testId: v.id("tests"),
    ownerId: v.id("users"),
    phase: v.string(),
    workKey: v.string(),
    attempts: v.array(attemptValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const attempt of args.attempts) {
      await ctx.db.insert("providerAttempts", {
        testId: args.testId,
        ownerId: args.ownerId,
        phase: args.phase,
        workKey: args.workKey,
        modelKey: attempt.modelKey,
        provider: attempt.provider,
        status: attempt.status,
        errorClass: attempt.errorClass,
        latencyMs: attempt.latencyMs,
        createdAt: now,
      });
    }
    return null;
  },
});

export const completePersonaBatch = internalMutation({
  args: {
    batchId: v.id("personaBatches"),
    claimToken: v.number(),
    personas: v.array(personaDataValidator),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("personaBatches", args.batchId);
    if (
      !batch ||
      batch.status !== "running" ||
      batch.attempts !== args.claimToken
    ) {
      return { status: "ignored" as const };
    }
    if (args.personas.length !== batch.requestedCount) {
      return {
        status: "validation_failed" as const,
        errorMessage: "Persona batch returned the wrong number of respondents",
      };
    }
    const existing = await ctx.db
      .query("personas")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", batch.snapshotId))
      .take(300);
    const fingerprints = new Set(
      existing.map((persona) => persona.uniquenessFingerprint),
    );
    const names = new Set(
      existing.map((persona) => persona.displayName.toLowerCase()),
    );
    for (const persona of args.personas) {
      if (
        fingerprints.has(persona.uniquenessFingerprint) ||
        names.has(persona.displayName.toLowerCase())
      ) {
        return {
          status: "validation_failed" as const,
          errorMessage: "Persona batch did not contain distinct respondents",
        };
      }
      fingerprints.add(persona.uniquenessFingerprint);
      names.add(persona.displayName.toLowerCase());
    }

    const now = Date.now();
    for (let index = 0; index < args.personas.length; index += 1) {
      const persona = args.personas[index];
      await ctx.db.insert("personas", {
        testId: batch.testId,
        snapshotId: batch.snapshotId,
        ownerId: batch.ownerId,
        batchId: batch._id,
        respondentKey: `respondent-${String(batch.startIndex + index + 1).padStart(3, "0")}`,
        ...persona,
        createdAt: now,
      });
    }
    await ctx.db.patch("personaBatches", batch._id, {
      status: "completed",
      leaseExpiresAt: undefined,
      errorMessage: undefined,
      updatedAt: now,
    });
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", batch.testId))
      .unique();
    if (!progress) throw new Error("Test progress not found");
    const personaCount = progress.personaCount + args.personas.length;
    await ctx.db.patch("testProgress", progress._id, {
      personaCount,
      phaseLabel: `Built ${personaCount} of ${progress.totalRespondents} respondents`,
      updatedAt: now,
    });

    if (personaCount < progress.totalRespondents) {
      const requestedCount = Math.min(
        PERSONA_BATCH_SIZE,
        progress.totalRespondents - personaCount,
      );
      const nextBatchId = await ctx.db.insert("personaBatches", {
        testId: batch.testId,
        snapshotId: batch.snapshotId,
        ownerId: batch.ownerId,
        batchNumber: batch.batchNumber + 1,
        requestedCount,
        startIndex: personaCount,
        status: "pending",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.executionActions.generatePersonaBatch,
        {
          batchId: nextBatchId,
        },
      );
      return { status: "completed" as const };
    }

    const allPersonas = await ctx.db
      .query("personas")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", batch.snapshotId))
      .take(300);
    if (allPersonas.length !== progress.totalRespondents) {
      throw new Error(
        "Persona generation count did not match the test snapshot",
      );
    }
    const test = await ctx.db.get("tests", batch.testId);
    if (!test) throw new Error("Test not found");
    const respondentModels = getRespondentModels(test.optionType === "image");
    for (let index = 0; index < allPersonas.length; index += 1) {
      const persona = allPersonas[index];
      const modelKey = respondentModels[index % respondentModels.length];
      if (!persona || !modelKey) throw new Error("Respondent routing failed");
      const existingRun = await ctx.db
        .query("respondentRuns")
        .withIndex("by_testId_and_personaId", (q) =>
          q.eq("testId", batch.testId).eq("personaId", persona._id),
        )
        .unique();
      if (!existingRun) {
        await ctx.db.insert("respondentRuns", {
          testId: batch.testId,
          snapshotId: batch.snapshotId,
          ownerId: batch.ownerId,
          personaId: persona._id,
          modelKey,
          status: "pending",
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await syncDashboardStatsForTest(ctx, test, "running_respondents");
    await ctx.db.patch("tests", test._id, {
      status: "running_respondents",
      updatedAt: now,
    });
    await ctx.db.patch("testProgress", progress._id, {
      status: "running_respondents",
      phaseLabel: "Collecting independent responses",
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.execution.dispatchRespondents, {
      testId: batch.testId,
    });
    return { status: "completed" as const };
  },
});

export const failPersonaBatch = internalMutation({
  args: {
    batchId: v.id("personaBatches"),
    claimToken: v.number(),
    retryable: v.boolean(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get("personaBatches", args.batchId);
    if (
      !batch ||
      batch.status !== "running" ||
      batch.attempts !== args.claimToken
    ) {
      return null;
    }
    const now = Date.now();
    if (args.retryable && batch.attempts < MAX_WORK_ATTEMPTS) {
      await ctx.db.patch("personaBatches", batch._id, {
        status: "pending",
        leaseExpiresAt: undefined,
        errorMessage: args.errorMessage.slice(0, 500),
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        2 ** batch.attempts * 2_000,
        internal.executionActions.generatePersonaBatch,
        { batchId: batch._id },
      );
      return null;
    }
    await terminallyFailPersonaBatch(ctx, batch, args.errorMessage);
    return null;
  },
});

export const dispatchRespondents = internalMutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const test = await ctx.db.get("tests", args.testId);
    if (!test || test.status !== "running_respondents") return null;
    const running = await ctx.db
      .query("respondentRuns")
      .withIndex("by_testId_and_status", (q) =>
        q.eq("testId", test._id).eq("status", "running"),
      )
      .take(RESPONDENT_CONCURRENCY + 1);
    const available = Math.max(0, RESPONDENT_CONCURRENCY - running.length);
    const pending =
      available > 0
        ? await ctx.db
            .query("respondentRuns")
            .withIndex("by_testId_and_status", (q) =>
              q.eq("testId", test._id).eq("status", "pending"),
            )
            .take(available)
        : [];
    const now = Date.now();
    let launched = 0;
    for (const run of pending) {
      if (run.attempts >= MAX_WORK_ATTEMPTS) {
        await terminallyFailRespondent(
          ctx,
          run,
          run.errorClass ?? "unknown",
          run.errorMessage ?? "Respondent exhausted its retry limit",
        );
        continue;
      }
      const claimToken = run.attempts + 1;
      await ctx.db.patch("respondentRuns", run._id, {
        status: "running",
        attempts: claimToken,
        leaseExpiresAt: now + ROUTED_GENERATION_LEASE_MS,
        startedAt: run.startedAt ?? now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.executionActions.runRespondent, {
        runId: run._id,
        claimToken,
      });
      launched += 1;
    }
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    if (!progress) throw new Error("Test progress not found");
    await ctx.db.patch("testProgress", progress._id, {
      runningRespondents: running.length + launched,
      phaseLabel: `Collected ${progress.completedRespondents} of ${progress.totalRespondents} responses`,
      updatedAt: now,
    });

    if (
      running.length === 0 &&
      pending.length === 0 &&
      progress.completedRespondents + progress.failedRespondents >=
        progress.totalRespondents
    ) {
      await syncDashboardStatsForTest(ctx, test, "synthesizing");
      await ctx.db.patch("tests", test._id, {
        status: "synthesizing",
        updatedAt: now,
      });
      await ctx.db.patch("testProgress", progress._id, {
        status: "synthesizing",
        phaseLabel: "Synthesizing evidence",
        runningRespondents: 0,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.synthesis.start, {
        testId: test._id,
      });
    }
    return null;
  },
});

export const getRespondentPayload = internalQuery({
  args: {
    runId: v.id("respondentRuns"),
    claimToken: v.number(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get("respondentRuns", args.runId);
    if (!run || run.status !== "running" || run.attempts !== args.claimToken) {
      return null;
    }
    const snapshot = await ctx.db.get("testSnapshots", run.snapshotId);
    const persona = await ctx.db.get("personas", run.personaId);
    if (!snapshot || !persona)
      throw new Error("Respondent input is incomplete");
    const options = await ctx.db
      .query("snapshotOptions")
      .withIndex("by_snapshotId_and_position", (q) =>
        q.eq("snapshotId", snapshot._id),
      )
      .take(10);
    return { run, snapshot, persona, options };
  },
});

export const completeRespondent = internalMutation({
  args: {
    runId: v.id("respondentRuns"),
    claimToken: v.number(),
    selectedOptionId: v.id("snapshotOptions"),
    reasons: v.array(v.string()),
    comparisons: v.array(v.string()),
    objection: v.optional(v.string()),
    confidence: confidenceValidator,
    confidenceScore: v.number(),
    modelKey: modelKeyValidator,
    provider: providerValidator,
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get("respondentRuns", args.runId);
    if (!run) return null;
    const existing = await ctx.db
      .query("responses")
      .withIndex("by_runId", (q) => q.eq("runId", run._id))
      .unique();
    if (existing || run.status === "completed") return existing?._id ?? null;
    if (run.status !== "running" || run.attempts !== args.claimToken) {
      return null;
    }
    const selectedOption = await ctx.db.get(
      "snapshotOptions",
      args.selectedOptionId,
    );
    if (!selectedOption || selectedOption.snapshotId !== run.snapshotId) {
      throw new Error("Selected option does not belong to this test");
    }
    if (args.reasons.length < 3 || args.reasons.length > 4) {
      throw new Error("Respondent result requires three or four reasons");
    }
    if (args.confidenceScore < 0 || args.confidenceScore > 1) {
      throw new Error("Confidence score is out of range");
    }
    const now = Date.now();
    const responseId = await ctx.db.insert("responses", {
      testId: run.testId,
      snapshotId: run.snapshotId,
      ownerId: run.ownerId,
      runId: run._id,
      personaId: run.personaId,
      selectedOptionId: selectedOption._id,
      reasons: args.reasons.map((reason) => reason.slice(0, 500)),
      comparisons: args.comparisons.map((reason) => reason.slice(0, 500)),
      objection: args.objection?.slice(0, 500),
      confidence: args.confidence,
      confidenceScore: args.confidenceScore,
      modelKey: args.modelKey,
      provider: args.provider,
      startedAt: args.startedAt,
      completedAt: now,
    });
    await ctx.db.patch("respondentRuns", run._id, {
      status: "completed",
      leaseExpiresAt: undefined,
      completedAt: now,
      errorClass: undefined,
      errorMessage: undefined,
      updatedAt: now,
    });
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", run.testId))
      .unique();
    if (progress) {
      await ctx.db.patch("testProgress", progress._id, {
        completedRespondents: progress.completedRespondents + 1,
        runningRespondents: Math.max(0, progress.runningRespondents - 1),
        updatedAt: now,
      });
    }
    await ctx.scheduler.runAfter(0, internal.execution.dispatchRespondents, {
      testId: run.testId,
    });
    return responseId;
  },
});

export const releaseRespondentRetry = internalMutation({
  args: {
    runId: v.id("respondentRuns"),
    claimToken: v.number(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get("respondentRuns", args.runId);
    if (!run || run.status !== "retrying" || run.attempts !== args.claimToken) {
      return null;
    }
    await ctx.db.patch("respondentRuns", run._id, {
      status: "pending",
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.execution.dispatchRespondents, {
      testId: run.testId,
    });
    return null;
  },
});

export const failRespondent = internalMutation({
  args: {
    runId: v.id("respondentRuns"),
    claimToken: v.number(),
    retryable: v.boolean(),
    errorClass: errorClassValidator,
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get("respondentRuns", args.runId);
    if (!run || run.status !== "running" || run.attempts !== args.claimToken) {
      return null;
    }
    const now = Date.now();
    const shouldRetry = args.retryable && run.attempts < MAX_WORK_ATTEMPTS;
    if (!shouldRetry) {
      await terminallyFailRespondent(
        ctx,
        run,
        args.errorClass,
        args.errorMessage,
      );
      return null;
    }
    await ctx.db.patch("respondentRuns", run._id, {
      status: "retrying",
      leaseExpiresAt: undefined,
      errorClass: args.errorClass,
      errorMessage: args.errorMessage.slice(0, 500),
      updatedAt: now,
    });
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", run.testId))
      .unique();
    if (progress && run.status === "running") {
      await ctx.db.patch("testProgress", progress._id, {
        runningRespondents: Math.max(0, progress.runningRespondents - 1),
        updatedAt: now,
      });
    }
    await ctx.scheduler.runAfter(
      2 ** run.attempts * 2_000,
      internal.execution.releaseRespondentRetry,
      { runId: run._id, claimToken: run.attempts },
    );
    return null;
  },
});

export const reclaimStaleWork = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stalePersonaBatches = await ctx.db
      .query("personaBatches")
      .withIndex("by_status_and_leaseExpiresAt", (q) =>
        q.eq("status", "running").lt("leaseExpiresAt", now),
      )
      .take(20);
    for (const batch of stalePersonaBatches) {
      if (batch.attempts >= MAX_WORK_ATTEMPTS) {
        await terminallyFailPersonaBatch(
          ctx,
          batch,
          "Worker lease expired after the final persona attempt",
        );
        continue;
      }
      await ctx.db.patch("personaBatches", batch._id, {
        status: "pending",
        leaseExpiresAt: undefined,
        errorMessage: "Worker lease expired; retrying",
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(
        0,
        internal.executionActions.generatePersonaBatch,
        {
          batchId: batch._id,
        },
      );
    }

    const staleRuns = await ctx.db
      .query("respondentRuns")
      .withIndex("by_status_and_leaseExpiresAt", (q) =>
        q.eq("status", "running").lt("leaseExpiresAt", now),
      )
      .take(STALE_RESPONDENT_BATCH_SIZE);
    const affectedTests = new Set<Id<"tests">>();
    for (const run of staleRuns) {
      if (run.attempts >= MAX_WORK_ATTEMPTS) {
        await terminallyFailRespondent(
          ctx,
          run,
          "timeout",
          "Worker lease expired after the final respondent attempt",
        );
        continue;
      }
      await ctx.db.patch("respondentRuns", run._id, {
        status: "pending",
        leaseExpiresAt: undefined,
        errorClass: "timeout",
        errorMessage: "Worker lease expired; retrying",
        updatedAt: now,
      });
      affectedTests.add(run.testId);
    }
    for (const testId of affectedTests) {
      await ctx.scheduler.runAfter(0, internal.execution.dispatchRespondents, {
        testId,
      });
    }
    if (staleRuns.length === STALE_RESPONDENT_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.execution.reclaimStaleWork, {});
    }
    return {
      personaBatches: stalePersonaBatches.length,
      runs: staleRuns.length,
    };
  },
});
