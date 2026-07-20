import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { CREDIT_OPTIONS, getCreditOption } from "./lib/credits";
import { requireUser } from "./lib/auth";
import { creditOptionKeyValidator } from "./lib/validators";

function validateRequestId(requestId: string) {
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(requestId)) {
    throw new Error("Invalid checkout request identifier");
  }
}

function isPositiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

export const purchaseOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return CREDIT_OPTIONS.map(({ key, priceCents, credits, bonusPercent }) => ({
      key,
      priceCents,
      credits,
      bonusPercent,
    }));
  },
});

export const prepareCheckout = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    optionKey: creditOptionKeyValidator,
    productId: v.string(),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    validateRequestId(args.requestId);
    const option = getCreditOption(args.optionKey);
    const productId = args.productId.trim();
    if (!productId || productId.length > 200) {
      throw new Error("Invalid Creem product identifier");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User profile is not initialized");
    const existing = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (existing) {
      if (
        existing.ownerId !== user._id ||
        existing.optionKey !== option.key ||
        existing.productId !== productId ||
        existing.priceCents !== option.priceCents ||
        existing.credits !== option.credits
      ) {
        throw new Error("Checkout request identifier is already in use");
      }
      if (existing.status === "creating") {
        throw new Error("Checkout creation is already in progress");
      }
      if (existing.status === "failed" || existing.status === "cancelled") {
        await ctx.db.patch("checkoutSessions", existing._id, {
          status: "creating",
          errorMessage: undefined,
          updatedAt: Date.now(),
        });
        const retriedSession = await ctx.db.get(
          "checkoutSessions",
          existing._id,
        );
        if (!retriedSession) throw new Error("Checkout session not found");
        return { session: retriedSession, shouldCreate: true };
      }
      return { session: existing, shouldCreate: false };
    }
    const now = Date.now();
    const id = await ctx.db.insert("checkoutSessions", {
      ownerId: user._id,
      requestId: args.requestId,
      optionKey: option.key,
      productId,
      priceCents: option.priceCents,
      credits: option.credits,
      status: "creating",
      refundedAmountCents: 0,
      reversedCredits: 0,
      createdAt: now,
      updatedAt: now,
    });
    const session = await ctx.db.get("checkoutSessions", id);
    if (!session) throw new Error("Could not create checkout session");
    return { session, shouldCreate: true };
  },
});

export const completeCheckoutCreation = internalMutation({
  args: {
    sessionId: v.id("checkoutSessions"),
    checkoutId: v.string(),
    checkoutUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("checkoutSessions", args.sessionId);
    if (!session) throw new Error("Checkout session not found");
    if (
      session.status === "completed" ||
      session.status === "partially_refunded" ||
      session.status === "refunded" ||
      session.status === "disputed"
    ) {
      return session.checkoutUrl;
    }
    await ctx.db.patch("checkoutSessions", session._id, {
      checkoutId: args.checkoutId,
      checkoutUrl: args.checkoutUrl,
      status: "pending",
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
    return args.checkoutUrl;
  },
});

export const failCheckoutCreation = internalMutation({
  args: {
    sessionId: v.id("checkoutSessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("checkoutSessions", args.sessionId);
    if (!session || session.status !== "creating") return null;
    await ctx.db.patch("checkoutSessions", session._id, {
      status: "failed",
      errorMessage: args.errorMessage.slice(0, 500),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const processCheckoutWebhook = internalMutation({
  args: {
    eventId: v.string(),
    payloadHash: v.string(),
    requestId: v.string(),
    checkoutId: v.string(),
    productId: v.string(),
    productPriceCents: v.optional(v.number()),
    units: v.number(),
    orderId: v.string(),
    orderProductId: v.optional(v.string()),
    orderAmountCents: v.number(),
    orderCurrency: v.string(),
    orderStatus: v.string(),
    transactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existingEvent) {
      if (existingEvent.payloadHash !== args.payloadHash) {
        throw new Error("Webhook event ID was reused with a different payload");
      }
      return { duplicate: true, credited: false };
    }

    const session = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (!session) throw new Error("Checkout session is not available yet");
    const option = getCreditOption(session.optionKey);
    const valid =
      session.checkoutId === args.checkoutId &&
      session.productId === args.productId &&
      session.priceCents === option.priceCents &&
      session.credits === option.credits &&
      (args.productPriceCents === undefined ||
        args.productPriceCents === option.priceCents) &&
      args.units === 1 &&
      (args.orderProductId === undefined ||
        args.orderProductId === session.productId) &&
      args.orderAmountCents === option.priceCents &&
      args.orderCurrency.toUpperCase() === "USD" &&
      args.orderStatus === "paid";
    const now = Date.now();
    if (!valid) {
      await ctx.db.insert("webhookEvents", {
        eventId: args.eventId,
        eventType: "checkout.completed",
        payloadHash: args.payloadHash,
        status: "failed",
        errorMessage: "Checkout payload did not match a Plurena credit option",
        createdAt: now,
        processedAt: now,
      });
      return { duplicate: false, credited: false };
    }

    const externalKey = `creem:checkout:${args.checkoutId}`;
    const existingCredit = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_externalKey", (q) => q.eq("externalKey", externalKey))
      .unique();
    const hasReversal =
      existingCredit !== null &&
      (session.status === "partially_refunded" ||
        session.status === "refunded" ||
        session.status === "disputed");
    if (!existingCredit) {
      const user = await ctx.db.get("users", session.ownerId);
      if (!user) throw new Error("Checkout owner no longer exists");
      const resultingCreditBalance = user.creditBalance + session.credits;
      await ctx.db.patch("users", user._id, {
        creditBalance: resultingCreditBalance,
        updatedAt: now,
      });
      await ctx.db.insert("ledgerEntries", {
        ownerId: user._id,
        type: "credit_purchase",
        amountCredits: session.credits,
        resultingCreditBalance,
        reason: `Purchased ${session.credits.toLocaleString("en-US")} credits`,
        externalKey,
        checkoutId: args.checkoutId,
        createdAt: now,
      });
    }
    await ctx.db.patch("checkoutSessions", session._id, {
      status: hasReversal ? session.status : "completed",
      orderId: args.orderId,
      transactionId: args.transactionId,
      errorMessage: hasReversal ? session.errorMessage : undefined,
      updatedAt: now,
    });
    await ctx.db.insert("webhookEvents", {
      eventId: args.eventId,
      eventType: "checkout.completed",
      payloadHash: args.payloadHash,
      status: "processed",
      createdAt: now,
      processedAt: now,
    });
    return { duplicate: false, credited: !existingCredit };
  },
});

export const processPaymentReversal = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.union(
      v.literal("refund.created"),
      v.literal("dispute.created"),
    ),
    payloadHash: v.string(),
    reversalId: v.string(),
    checkoutId: v.optional(v.string()),
    orderId: v.optional(v.string()),
    transactionId: v.string(),
    amountCents: v.number(),
    transactionAmountPaidCents: v.number(),
    cumulativeRefundedAmountCents: v.optional(v.number()),
    paymentStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existingEvent) {
      if (existingEvent.payloadHash !== args.payloadHash) {
        throw new Error("Webhook event ID was reused with a different payload");
      }
      return { duplicate: true, reversedCredits: 0 };
    }

    const byCheckout = args.checkoutId
      ? await ctx.db
          .query("checkoutSessions")
          .withIndex("by_checkoutId", (q) =>
            q.eq("checkoutId", args.checkoutId),
          )
          .unique()
      : null;
    const byOrder = args.orderId
      ? await ctx.db
          .query("checkoutSessions")
          .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
          .unique()
      : null;
    if (byCheckout && byOrder && byCheckout._id !== byOrder._id) {
      throw new Error("Payment reversal references conflicting purchases");
    }
    const session = byCheckout ?? byOrder;
    if (!session) throw new Error("Payment purchase is not available yet");
    if (
      !session.checkoutId ||
      (session.transactionId && session.transactionId !== args.transactionId)
    ) {
      throw new Error("Payment reversal does not match its purchase");
    }
    const purchase = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_externalKey", (q) =>
        q.eq("externalKey", `creem:checkout:${session.checkoutId}`),
      )
      .unique();
    if (!purchase || purchase.type !== "credit_purchase") {
      throw new Error("Payment purchase has not been credited yet");
    }

    const isRefund = args.eventType === "refund.created";
    const isProcessable = isRefund
      ? args.paymentStatus === "succeeded"
      : args.paymentStatus === "chargeback";
    const now = Date.now();
    if (!isProcessable) {
      await ctx.db.insert("webhookEvents", {
        eventId: args.eventId,
        eventType: args.eventType,
        payloadHash: args.payloadHash,
        status: "ignored",
        errorMessage: `Payment reversal status was ${args.paymentStatus}`,
        createdAt: now,
        processedAt: now,
      });
      return { duplicate: false, reversedCredits: 0 };
    }
    if (
      !isPositiveInteger(args.amountCents) ||
      !isPositiveInteger(args.transactionAmountPaidCents) ||
      args.transactionAmountPaidCents < session.priceCents
    ) {
      throw new Error("Payment reversal amount is invalid");
    }

    const externalKey = `creem:${isRefund ? "refund" : "dispute"}:${args.reversalId}`;
    const existingReversal = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_externalKey", (q) => q.eq("externalKey", externalKey))
      .unique();
    if (existingReversal) {
      await ctx.db.insert("webhookEvents", {
        eventId: args.eventId,
        eventType: args.eventType,
        payloadHash: args.payloadHash,
        status: "processed",
        createdAt: now,
        processedAt: now,
      });
      return { duplicate: false, reversedCredits: 0 };
    }

    const cumulativeRefundedAmountCents = isRefund
      ? args.cumulativeRefundedAmountCents === undefined
        ? session.refundedAmountCents + args.amountCents
        : Math.max(
            session.refundedAmountCents,
            args.cumulativeRefundedAmountCents,
          )
      : session.refundedAmountCents;
    const proportionalCredits = Math.ceil(
      (session.credits *
        (isRefund ? cumulativeRefundedAmountCents : args.amountCents)) /
        args.transactionAmountPaidCents,
    );
    const targetReversedCredits = Math.min(
      session.credits,
      isRefund
        ? proportionalCredits
        : session.reversedCredits + proportionalCredits,
    );
    const creditsToReverse = Math.max(
      0,
      targetReversedCredits - session.reversedCredits,
    );
    let appliedCredits = 0;
    if (creditsToReverse > 0) {
      const user = await ctx.db.get("users", session.ownerId);
      if (!user) throw new Error("Checkout owner no longer exists");
      const resultingCreditBalance = user.creditBalance - creditsToReverse;
      await ctx.db.patch("users", user._id, {
        creditBalance: resultingCreditBalance,
        updatedAt: now,
      });
      await ctx.db.insert("ledgerEntries", {
        ownerId: user._id,
        type: isRefund ? "payment_refund" : "payment_dispute",
        amountCredits: -creditsToReverse,
        resultingCreditBalance,
        reason: isRefund
          ? `Creem refund reversed ${creditsToReverse.toLocaleString("en-US")} credits`
          : `Creem dispute reversed ${creditsToReverse.toLocaleString("en-US")} credits`,
        externalKey,
        checkoutId: session.checkoutId,
        createdAt: now,
      });
      appliedCredits = creditsToReverse;
    }
    const reversedCredits = Math.max(
      session.reversedCredits,
      targetReversedCredits,
    );
    await ctx.db.patch("checkoutSessions", session._id, {
      status: isRefund
        ? session.status === "disputed"
          ? "disputed"
          : reversedCredits === session.credits
            ? "refunded"
            : "partially_refunded"
        : "disputed",
      refundedAmountCents: cumulativeRefundedAmountCents,
      reversedCredits,
      errorMessage: isRefund
        ? "Payment refunded; the corresponding credits were reversed"
        : "Payment disputed; the corresponding credits were reversed",
      updatedAt: now,
    });
    await ctx.db.insert("webhookEvents", {
      eventId: args.eventId,
      eventType: args.eventType,
      payloadHash: args.payloadHash,
      status: "processed",
      createdAt: now,
      processedAt: now,
    });
    return { duplicate: false, reversedCredits: appliedCredits };
  },
});

export const recordIgnoredWebhook = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existing) {
      if (existing.payloadHash !== args.payloadHash) {
        throw new Error("Webhook event ID was reused with a different payload");
      }
      return null;
    }
    const now = Date.now();
    await ctx.db.insert("webhookEvents", {
      ...args,
      status: "ignored",
      createdAt: now,
      processedAt: now,
    });
    return null;
  },
});

export const checkoutStatus = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (!session || session.ownerId !== user._id) {
      throw new Error("Unauthorized");
    }
    return {
      status: session.status,
      credits: session.credits,
      errorMessage: session.errorMessage,
    };
  },
});

export const cancelCheckout = mutation({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const session = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (!session || session.ownerId !== user._id) {
      throw new Error("Unauthorized");
    }
    if (session.status !== "creating" && session.status !== "pending") {
      return null;
    }
    await ctx.db.patch("checkoutSessions", session._id, {
      status: "cancelled",
      errorMessage: "Checkout cancelled",
      updatedAt: Date.now(),
    });
    return null;
  },
});
