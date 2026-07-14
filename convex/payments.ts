import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { MIN_TOP_UP_CENTS } from "./lib/pricing";
import { applyCreditEntry } from "./lib/credits";

const ALLOWED_TOP_UPS = new Set([1_000, 2_000, 5_000, 10_000]);

export const createIntent = mutation({
  args: { requestId: v.string(), amountCents: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!ALLOWED_TOP_UPS.has(args.amountCents) || args.amountCents < MIN_TOP_UP_CENTS) throw new Error("INVALID_TOP_UP");
    const existing = await ctx.db.query("payments").withIndex("by_request", (q) => q.eq("requestId", args.requestId)).unique();
    if (existing) {
      if (String(existing.userId) !== String(user._id) || existing.amountCents !== args.amountCents) throw new Error("IDEMPOTENCY_KEY_REUSED");
      if (existing.status !== "pending") throw new Error("PAYMENT_ALREADY_TERMINAL");
      return existing;
    }
    const recent = await ctx.db.query("payments").withIndex("by_user_created", (q) =>
      q.eq("userId", user._id).gte("createdAt", Date.now() - 60 * 60 * 1_000),
    ).take(10);
    if (recent.length >= 10) throw new Error("CHECKOUT_RATE_LIMIT");
    const paymentId = await ctx.db.insert("payments", {
      userId: user._id,
      requestId: args.requestId,
      amountCents: args.amountCents,
      currency: "USD",
      status: "pending",
      checkoutAttemptCount: 0,
      createdAt: Date.now(),
    });
    return await ctx.db.get(paymentId);
  },
});

export const claimCheckout = mutation({
  args: { paymentId: v.id("payments"), claimToken: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment || String(payment.userId) !== String(user._id)) throw new Error("NOT_FOUND");
    if (payment.status !== "pending") throw new Error("PAYMENT_ALREADY_TERMINAL");
    if (payment.checkoutUrl) return { claimed: false, checkoutUrl: payment.checkoutUrl };
    const checkoutAttemptCount = payment.checkoutAttemptCount ?? 0;
    if (checkoutAttemptCount >= 3) throw new Error("CHECKOUT_RETRY_LIMIT");
    if (payment.lastCheckoutAttemptAt && payment.lastCheckoutAttemptAt > Date.now() - 10_000) return { claimed: false };
    if (payment.checkoutClaimedAt && payment.checkoutClaimedAt > Date.now() - 30_000) return { claimed: false };
    await ctx.db.patch(payment._id, { checkoutClaimedAt: Date.now(), checkoutClaimToken: args.claimToken, checkoutAttemptCount: checkoutAttemptCount + 1, lastCheckoutAttemptAt: Date.now() });
    return { claimed: true };
  },
});

export const releaseCheckout = mutation({
  args: { paymentId: v.id("payments"), claimToken: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const payment = await ctx.db.get(args.paymentId);
    if (payment && payment.status === "pending" && String(payment.userId) === String(user._id) && payment.checkoutClaimToken === args.claimToken && !payment.checkoutUrl) {
      await ctx.db.patch(payment._id, { checkoutClaimedAt: undefined, checkoutClaimToken: undefined });
    }
  },
});

export const attachCheckout = mutation({
  args: { paymentId: v.id("payments"), claimToken: v.string(), checkoutId: v.string(), checkoutUrl: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment || String(payment.userId) !== String(user._id)) throw new Error("NOT_FOUND");
    if (payment.status !== "pending") throw new Error("PAYMENT_ALREADY_TERMINAL");
    if (payment.checkoutUrl) return { checkoutUrl: payment.checkoutUrl };
    if (payment.creemCheckoutId && payment.creemCheckoutId !== args.checkoutId) throw new Error("CHECKOUT_MISMATCH");
    if (payment.checkoutClaimToken !== args.claimToken) throw new Error("CHECKOUT_CLAIM_LOST");
    await ctx.db.patch(payment._id, { creemCheckoutId: args.checkoutId, checkoutUrl: args.checkoutUrl, checkoutClaimedAt: undefined, checkoutClaimToken: undefined });
    return { checkoutUrl: args.checkoutUrl };
  },
});

export const applyWebhook = mutation({
  args: {
    forwardSecret: v.string(),
    eventId: v.string(),
    requestId: v.string(),
    checkoutId: v.string(),
    orderId: v.optional(v.string()),
    customerId: v.optional(v.string()),
    amountCents: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.PAYMENT_WEBHOOK_FORWARD_SECRET || args.forwardSecret !== process.env.PAYMENT_WEBHOOK_FORWARD_SECRET) throw new Error("UNAUTHORIZED");
    const duplicate = await ctx.db.query("payments").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).unique();
    if (duplicate) return { duplicate: true };
    const payment = await ctx.db.query("payments").withIndex("by_request", (q) => q.eq("requestId", args.requestId)).unique();
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.status === "completed") return { duplicate: true };
    if (payment.amountCents !== args.amountCents || args.currency.toUpperCase() !== "USD") throw new Error("PAYMENT_MISMATCH");
    if (payment.creemCheckoutId && payment.creemCheckoutId !== args.checkoutId) throw new Error("CHECKOUT_MISMATCH");
    const user = await ctx.db.get(payment.userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    const ledgerKey = `creem:${args.checkoutId}`;
    const ledger = await ctx.db.query("creditLedger").withIndex("by_user_idempotency", (q) =>
      q.eq("userId", user._id).eq("idempotencyKey", ledgerKey),
    ).unique();
    if (ledger) return { duplicate: true };
    const now = Date.now();
    const balanceCents = applyCreditEntry({ balanceCents: user.balanceCents, appliedKeys: new Set<string>() }, ledgerKey, payment.amountCents).balanceCents;
    await ctx.db.patch(payment._id, {
      status: "completed",
      eventId: args.eventId,
      creemCheckoutId: args.checkoutId,
      creemOrderId: args.orderId,
      creemCustomerId: args.customerId,
      completedAt: now,
      checkoutClaimedAt: undefined,
      checkoutClaimToken: undefined,
    });
    await ctx.db.insert("creditLedger", {
      userId: user._id,
      amountCents: payment.amountCents,
      balanceAfterCents: balanceCents,
      kind: "top_up",
      idempotencyKey: ledgerKey,
      paymentId: payment._id,
      note: "Creem credit top-up",
      createdAt: now,
    });
    await ctx.db.patch(user._id, { balanceCents, updatedAt: now });
    return { duplicate: false, balanceCents };
  },
});
