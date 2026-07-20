"use node";

import { Creem } from "creem";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, env } from "./_generated/server";
import { getConfiguredCreditOption } from "./lib/credits";
import { creditOptionKeyValidator } from "./lib/validators";

function requireEnvironment(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export const createCheckout = action({
  args: {
    optionKey: creditOptionKeyValidator,
    requestId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ checkoutUrl: string; requestId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const apiKey = requireEnvironment(env.CREEM_API_KEY, "CREEM_API_KEY");
    const option = getConfiguredCreditOption(args.optionKey, env);
    const appUrl = requireEnvironment(env.APP_URL, "APP_URL").replace(
      /\/$/,
      "",
    );
    const prepared: {
      session: Doc<"checkoutSessions">;
      shouldCreate: boolean;
    } = await ctx.runMutation(internal.payments.prepareCheckout, {
      tokenIdentifier: identity.tokenIdentifier,
      optionKey: option.key,
      productId: option.productId,
      requestId: args.requestId,
    });
    const { session } = prepared;
    if (!prepared.shouldCreate) {
      if (session.checkoutUrl) {
        return {
          checkoutUrl: session.checkoutUrl,
          requestId: session.requestId,
        };
      }
      throw new Error("Checkout request has already been processed");
    }

    try {
      const creem = new Creem({
        apiKey,
        serverURL: env.CREEM_API_BASE_URL ?? "https://api.creem.io",
      });
      const checkout = await creem.checkouts.create({
        productId: option.productId,
        requestId: args.requestId,
        units: 1,
        customer: identity.email ? { email: identity.email } : undefined,
        successUrl: `${appUrl}/app/billing/success?session=${encodeURIComponent(args.requestId)}`,
        metadata: { requestId: args.requestId, optionKey: option.key },
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
