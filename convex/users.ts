import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const ONBOARDING_BONUS_CENTS = 600;

export const syncCurrentUser = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (existing) {
      await ctx.db.patch("users", existing._id, {
        email: args.email ?? identity.email,
        name: args.name ?? identity.name,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      email: args.email ?? identity.email,
      name: args.name ?? identity.name,
      imageUrl: args.imageUrl,
      balanceCents: ONBOARDING_BONUS_CENTS,
      onboardingGranted: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("dashboardStats", {
      ownerId: userId,
      active: 0,
      completed: 0,
      updatedAt: now,
    });
    await ctx.db.insert("ledgerEntries", {
      ownerId: userId,
      type: "onboarding_bonus",
      amountCents: ONBOARDING_BONUS_CENTS,
      resultingBalanceCents: ONBOARDING_BONUS_CENTS,
      reason: "Welcome credit",
      externalKey: `onboarding:${identity.tokenIdentifier}`,
      createdAt: now,
    });
    return userId;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      balanceCents: user.balanceCents,
      createdAt: user.createdAt,
    };
  },
});

export const ledger = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 50), 100));
    return await ctx.db
      .query("ledgerEntries")
      .withIndex("by_ownerId_and_createdAt", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .take(limit);
  },
});
