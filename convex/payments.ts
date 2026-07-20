import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const TOP_UP_UNIT_CENTS = 500;
const MAX_TOP_UP_QUANTITY = 100;

function validateCheckoutInput(quantity: number, requestId: string) {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_TOP_UP_QUANTITY
  ) {
    throw new Error("Top-up quantity must be between 1 and 100");
  }
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(requestId)) {
    throw new Error("Invalid checkout request identifier");
  }
}

export const prepareCheckout = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    quantity: v.number(),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    validateCheckoutInput(args.quantity, args.requestId);
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
        existing.quantity !== args.quantity
      ) {
        throw new Error("Checkout request identifier is already in use");
      }
      return existing;
    }
    const now = Date.now();
    const id = await ctx.db.insert("checkoutSessions", {
      ownerId: user._id,
      requestId: args.requestId,
      quantity: args.quantity,
      expectedCreditCents: args.quantity * TOP_UP_UNIT_CENTS,
      status: "creating",
      createdAt: now,
      updatedAt: now,
    });
    const session = await ctx.db.get("checkoutSessions", id);
    if (!session) throw new Error("Could not create checkout session");
    return session;
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
    if (session.status === "completed") return session.checkoutUrl;
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
    if (!session || session.status === "completed") return null;
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
    eventType: v.string(),
    payloadHash: v.string(),
    requestId: v.string(),
    checkoutId: v.string(),
    productId: v.string(),
    configuredProductId: v.string(),
    units: v.number(),
    orderId: v.string(),
    orderStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existingEvent) return { duplicate: true, credited: false };

    const now = Date.now();
    if (args.eventType !== "checkout.completed") {
      await ctx.db.insert("webhookEvents", {
        eventId: args.eventId,
        eventType: args.eventType,
        payloadHash: args.payloadHash,
        status: "ignored",
        createdAt: now,
        processedAt: now,
      });
      return { duplicate: false, credited: false };
    }
    const session = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique();
    const valid =
      session &&
      args.productId === args.configuredProductId &&
      args.units === session.quantity &&
      args.orderStatus === "paid";
    if (!valid) {
      await ctx.db.insert("webhookEvents", {
        eventId: args.eventId,
        eventType: args.eventType,
        payloadHash: args.payloadHash,
        status: "failed",
        errorMessage: "Checkout payload did not match a pending Plurena top-up",
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
    if (!existingCredit) {
      const user = await ctx.db.get("users", session.ownerId);
      if (!user) throw new Error("Checkout owner no longer exists");
      const resultingBalanceCents =
        user.balanceCents + session.expectedCreditCents;
      await ctx.db.patch("users", user._id, {
        balanceCents: resultingBalanceCents,
        updatedAt: now,
      });
      await ctx.db.insert("ledgerEntries", {
        ownerId: user._id,
        type: "top_up",
        amountCents: session.expectedCreditCents,
        resultingBalanceCents,
        reason: `Creem top-up (${args.units} × $5)`,
        externalKey,
        checkoutId: args.checkoutId,
        createdAt: now,
      });
    }
    await ctx.db.patch("checkoutSessions", session._id, {
      status: "completed",
      checkoutId: args.checkoutId,
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
    return { duplicate: false, credited: !existingCredit };
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
    if (!session || session.ownerId !== user._id)
      throw new Error("Unauthorized");
    return {
      status: session.status,
      expectedCreditCents: session.expectedCreditCents,
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
    if (!session || session.ownerId !== user._id)
      throw new Error("Unauthorized");
    if (session.status === "completed") return null;
    await ctx.db.patch("checkoutSessions", session._id, {
      status: "failed",
      errorMessage: "Checkout canceled",
      updatedAt: Date.now(),
    });
    return null;
  },
});
