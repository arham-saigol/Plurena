import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { requireIdentity, requireUser } from "./lib/auth";
import { ONBOARDING_BONUS_CENTS } from "./lib/pricing";
import { applyCreditEntry } from "./lib/credits";

const ALLOWED_GOALS = new Set(["validate-ideas", "compare-creative", "improve-messaging", "explore-needs"]);
const ALLOWED_INTEGRATIONS = new Set(["manual", "api", "product-workflow", "not-sure"]);
const MAX_DAILY_PROMOTION_CLAIMS = 20;
const MAX_DAILY_PROMOTION_CENTS = MAX_DAILY_PROMOTION_CLAIMS * ONBOARDING_BONUS_CENTS;
const DELETION_BATCH_SIZE = 50;

export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email,
        name: identity.name,
        imageUrl: identity.pictureUrl,
        tokenIdentifier: identity.tokenIdentifier,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.pictureUrl,
      balanceCents: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
  },
});

export const completeOnboarding = mutation({
  args: { goals: v.array(v.string()), integrationPlans: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!args.goals.length || !args.integrationPlans.length) throw new Error("ANSWER_BOTH_QUESTIONS");
    if (args.goals.some((item) => !ALLOWED_GOALS.has(item)) || args.integrationPlans.some((item) => !ALLOWED_INTEGRATIONS.has(item))) {
      throw new Error("INVALID_ONBOARDING_ANSWER");
    }
    if (user.onboardingClaimedAt) return { claimed: false, balanceCents: user.balanceCents };
    const previous = await ctx.db.query("creditLedger").withIndex("by_user_idempotency", (q) =>
      q.eq("userId", user._id).eq("idempotencyKey", `onboarding:${user._id}`),
    ).unique();
    if (previous) return { claimed: false, balanceCents: user.balanceCents };
    const now = Date.now();
    const promotionDay = new Date(now).toISOString().slice(0, 10);
    const dailyUsage = await ctx.db.query("promotionDailyUsage").withIndex("by_day", (q) => q.eq("day", promotionDay)).unique();
    if ((dailyUsage?.claimCount ?? 0) >= MAX_DAILY_PROMOTION_CLAIMS || (dailyUsage?.amountCents ?? 0) + ONBOARDING_BONUS_CENTS > MAX_DAILY_PROMOTION_CENTS) {
      throw new Error("PROMOTION_DAILY_LIMIT_REACHED");
    }
    const balanceCents = applyCreditEntry({ balanceCents: user.balanceCents, appliedKeys: new Set<string>() }, `onboarding:${user._id}`, ONBOARDING_BONUS_CENTS).balanceCents;
    await ctx.db.insert("onboardingAnswers", { userId: user._id, goals: [...new Set(args.goals)], integrationPlans: [...new Set(args.integrationPlans)], submittedAt: now });
    await ctx.db.insert("creditLedger", {
      userId: user._id,
      amountCents: ONBOARDING_BONUS_CENTS,
      balanceAfterCents: balanceCents,
      kind: "onboarding_bonus",
      idempotencyKey: `onboarding:${user._id}`,
      note: "Completed onboarding",
      createdAt: now,
    });
    if (dailyUsage) {
      await ctx.db.patch(dailyUsage._id, {
        claimCount: dailyUsage.claimCount + 1,
        amountCents: dailyUsage.amountCents + ONBOARDING_BONUS_CENTS,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("promotionDailyUsage", { day: promotionDay, claimCount: 1, amountCents: ONBOARDING_BONUS_CENTS, updatedAt: now });
    }
    await ctx.db.patch(user._id, { balanceCents, onboardingClaimedAt: now, updatedAt: now });
    return { claimed: true, balanceCents };
  },
});

export const ledger = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db.query("creditLedger").withIndex("by_user_created", (q) => q.eq("userId", user._id)).order("desc").take(50);
  },
});

export const requestAccountDeletion = mutation({
  args: { forwardSecret: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    const expected = process.env.CLERK_WEBHOOK_FORWARD_SECRET;
    if (!expected || args.forwardSecret !== expected) throw new Error("INVALID_WEBHOOK_SECRET");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId)).unique();
    if (!user) return { status: "complete" as const };
    const existing = await ctx.db.query("accountDeletionRequests").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId)).unique();
    const requestId = existing?._id ?? await ctx.db.insert("accountDeletionRequests", {
      clerkId: args.clerkId,
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.users.continueAccountDeletion, { requestId });
    return { status: "scheduled" as const };
  },
});

export const resumeAccountDeletions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("accountDeletionRequests").take(20);
    for (const request of requests) {
      await ctx.scheduler.runAfter(0, internal.users.continueAccountDeletion, { requestId: request._id });
    }
    return requests.length;
  },
});

export const continueAccountDeletion = internalMutation({
  args: { requestId: v.id("accountDeletionRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return { complete: true };
    const user = await ctx.db.get(request.userId);
    if (!user) {
      await ctx.db.delete(request._id);
      return { complete: true };
    }

    const assignment = await ctx.db.query("assignments").withIndex("by_user", (q) => q.eq("userId", user._id)).first();
    if (assignment) {
      const attempts = await ctx.db.query("modelAttempts").withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id)).take(DELETION_BATCH_SIZE);
      if (attempts.length) {
        for (const attempt of attempts) await ctx.db.delete(attempt._id);
      } else {
        const response = await ctx.db.query("responses").withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id)).unique();
        if (response) await ctx.db.delete(response._id);
        await ctx.db.delete(assignment._id);
      }
      await scheduleDeletionContinuation(ctx, request._id);
      return { complete: false };
    }

    const test = await ctx.db.query("tests").withIndex("by_user_created", (q) => q.eq("userId", user._id)).first();
    if (test) {
      const panelBuildAttempts = await ctx.db.query("panelBuildAttempts").withIndex("by_test", (q) => q.eq("testId", test._id)).take(DELETION_BATCH_SIZE);
      if (panelBuildAttempts.length) {
        for (const attempt of panelBuildAttempts) await ctx.db.delete(attempt._id);
        await scheduleDeletionContinuation(ctx, request._id);
        return { complete: false };
      }
      const synthesisAttempts = await ctx.db.query("synthesisAttempts").withIndex("by_test", (q) => q.eq("testId", test._id)).take(DELETION_BATCH_SIZE);
      if (synthesisAttempts.length) {
        for (const attempt of synthesisAttempts) await ctx.db.delete(attempt._id);
        await scheduleDeletionContinuation(ctx, request._id);
        return { complete: false };
      }
      const responses = await ctx.db.query("responses").withIndex("by_test", (q) => q.eq("testId", test._id)).take(DELETION_BATCH_SIZE);
      if (responses.length) {
        for (const response of responses) await ctx.db.delete(response._id);
        await scheduleDeletionContinuation(ctx, request._id);
        return { complete: false };
      }
      const personas = await ctx.db.query("personas").withIndex("by_test", (q) => q.eq("testId", test._id)).take(DELETION_BATCH_SIZE);
      if (personas.length) {
        for (const persona of personas) await ctx.db.delete(persona._id);
        await scheduleDeletionContinuation(ctx, request._id);
        return { complete: false };
      }
      for (const option of await ctx.db.query("options").withIndex("by_test", (q) => q.eq("testId", test._id)).take(10)) await ctx.db.delete(option._id);
      const aggregates = await ctx.db.query("aggregates").withIndex("by_test", (q) => q.eq("testId", test._id)).take(DELETION_BATCH_SIZE);
      if (aggregates.length) {
        for (const aggregate of aggregates) await ctx.db.delete(aggregate._id);
        await scheduleDeletionContinuation(ctx, request._id);
        return { complete: false };
      }
      const syntheses = await ctx.db.query("syntheses").withIndex("by_test", (q) => q.eq("testId", test._id)).take(DELETION_BATCH_SIZE);
      if (syntheses.length) {
        for (const synthesis of syntheses) await ctx.db.delete(synthesis._id);
        await scheduleDeletionContinuation(ctx, request._id);
        return { complete: false };
      }
      await ctx.db.delete(test._id);
      await scheduleDeletionContinuation(ctx, request._id);
      return { complete: false };
    }

    if (await deleteOwnedBatch(ctx, "responses", user._id)) return await continueLater(ctx, request._id);
    if (await deleteOwnedBatch(ctx, "options", user._id)) return await continueLater(ctx, request._id);
    if (await deleteOwnedBatch(ctx, "personas", user._id)) return await continueLater(ctx, request._id);
    if (await deleteOwnedBatch(ctx, "aggregates", user._id)) return await continueLater(ctx, request._id);
    if (await deleteOwnedBatch(ctx, "syntheses", user._id)) return await continueLater(ctx, request._id);

    const assets = await ctx.db.query("assets").withIndex("by_user", (q) => q.eq("userId", user._id)).take(DELETION_BATCH_SIZE);
    if (assets.length) {
      for (const asset of assets) {
        await ctx.storage.delete(asset.storageId);
        await ctx.db.delete(asset._id);
      }
      return await continueLater(ctx, request._id);
    }
    const onboardingAnswers = await ctx.db.query("onboardingAnswers").withIndex("by_user", (q) => q.eq("userId", user._id)).take(DELETION_BATCH_SIZE);
    if (onboardingAnswers.length) {
      for (const answer of onboardingAnswers) await ctx.db.delete(answer._id);
      return await continueLater(ctx, request._id);
    }
    const ledger = await ctx.db.query("creditLedger").withIndex("by_user_created", (q) => q.eq("userId", user._id)).take(DELETION_BATCH_SIZE);
    if (ledger.length) {
      for (const entry of ledger) await ctx.db.delete(entry._id);
      return await continueLater(ctx, request._id);
    }
    const payments = await ctx.db.query("payments").withIndex("by_user_created", (q) => q.eq("userId", user._id)).take(DELETION_BATCH_SIZE);
    if (payments.length) {
      for (const payment of payments) await ctx.db.delete(payment._id);
      return await continueLater(ctx, request._id);
    }
    const audiences = await ctx.db.query("savedAudiences").withIndex("by_user", (q) => q.eq("userId", user._id)).take(DELETION_BATCH_SIZE);
    if (audiences.length) {
      for (const audience of audiences) await ctx.db.delete(audience._id);
      return await continueLater(ctx, request._id);
    }
    const uploadGrants = await ctx.db.query("uploadGrants").withIndex("by_user_created", (q) => q.eq("userId", user._id)).take(DELETION_BATCH_SIZE);
    if (uploadGrants.length) {
      for (const grant of uploadGrants) await ctx.db.delete(grant._id);
      return await continueLater(ctx, request._id);
    }

    await ctx.db.delete(user._id);
    await ctx.db.delete(request._id);
    return { complete: true };
  },
});

async function scheduleDeletionContinuation(ctx: MutationCtx, requestId: Id<"accountDeletionRequests">) {
  await ctx.scheduler.runAfter(0, internal.users.continueAccountDeletion, { requestId });
}

async function continueLater(ctx: MutationCtx, requestId: Id<"accountDeletionRequests">) {
  await scheduleDeletionContinuation(ctx, requestId);
  return { complete: false };
}

async function deleteOwnedBatch(
  ctx: MutationCtx,
  table: "responses" | "options" | "personas" | "aggregates" | "syntheses",
  userId: Id<"users">,
) {
  if (table === "responses") {
    const rows = await ctx.db.query("responses").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH_SIZE);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length > 0;
  }
  if (table === "options") {
    const rows = await ctx.db.query("options").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH_SIZE);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length > 0;
  }
  if (table === "personas") {
    const rows = await ctx.db.query("personas").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH_SIZE);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length > 0;
  }
  if (table === "aggregates") {
    const rows = await ctx.db.query("aggregates").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH_SIZE);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length > 0;
  }
  const rows = await ctx.db.query("syntheses").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH_SIZE);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length > 0;
}
