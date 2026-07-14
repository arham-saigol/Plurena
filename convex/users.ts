import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireIdentity, requireUser } from "./lib/auth";
import { ONBOARDING_BONUS_CENTS } from "./lib/pricing";
import { applyCreditEntry } from "./lib/credits";

const ALLOWED_GOALS = new Set(["validate-ideas", "compare-creative", "improve-messaging", "explore-needs"]);
const ALLOWED_INTEGRATIONS = new Set(["manual", "api", "product-workflow", "not-sure"]);

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
