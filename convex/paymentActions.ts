"use node";

import { Creem } from "creem";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, env } from "./_generated/server";

function requireEnvironment(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export const createCheckout = action({
  args: {
    quantity: v.number(),
    requestId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ checkoutUrl: string; requestId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const apiKey = requireEnvironment(env.CREEM_API_KEY, "CREEM_API_KEY");
    const productId = requireEnvironment(
      env.CREEM_PRODUCT_ID,
      "CREEM_PRODUCT_ID",
    );
    const appUrl = requireEnvironment(env.APP_URL, "APP_URL").replace(
      /\/$/,
      "",
    );
    const session: Doc<"checkoutSessions"> = await ctx.runMutation(
      internal.payments.prepareCheckout,
      {
        tokenIdentifier: identity.tokenIdentifier,
        quantity: args.quantity,
        requestId: args.requestId,
      },
    );
    if (session.checkoutUrl && session.status === "pending") {
      return { checkoutUrl: session.checkoutUrl, requestId: session.requestId };
    }

    try {
      const creem = new Creem({
        apiKey,
        serverURL: env.CREEM_API_BASE_URL ?? "https://api.creem.io",
      });
      const checkout = await creem.checkouts.create({
        productId,
        requestId: args.requestId,
        units: args.quantity,
        customer: identity.email ? { email: identity.email } : undefined,
        successUrl: `${appUrl}/app/billing/success?session=${encodeURIComponent(args.requestId)}`,
        metadata: { requestId: args.requestId },
      });
      if (!checkout.checkoutUrl)
        throw new Error("Creem did not return a checkout URL");
      await ctx.runMutation(internal.payments.completeCheckoutCreation, {
        sessionId: session._id,
        checkoutId: checkout.id,
        checkoutUrl: checkout.checkoutUrl,
      });
      return { checkoutUrl: checkout.checkoutUrl, requestId: args.requestId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Checkout creation failed";
      await ctx.runMutation(internal.payments.failCheckoutCreation, {
        sessionId: session._id,
        errorMessage: message,
      });
      throw new Error("Could not create the checkout. Please try again.");
    }
  },
});
