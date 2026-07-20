import {
  constructWebhookEvent,
  WebhookVerificationError,
} from "creem/webhooks";
import { z } from "zod";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";

const checkoutSchema = z.object({
  id: z.string(),
  requestId: z.string().optional(),
  request_id: z.string().optional(),
  units: z.number().int().positive(),
  product: z.union([z.string(), z.object({ id: z.string() }).passthrough()]),
  order: z.object({
    id: z.string(),
    status: z.string(),
  }),
});

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const http = httpRouter();

http.route({
  path: "/creem/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!env.CREEM_WEBHOOK_SECRET || !env.CREEM_PRODUCT_ID) {
      return new Response("Payment integration is not configured", {
        status: 503,
      });
    }
    const rawBody = await request.text();
    let event: Awaited<ReturnType<typeof constructWebhookEvent>>;
    try {
      event = await constructWebhookEvent(rawBody, request.headers, {
        secret: env.CREEM_WEBHOOK_SECRET,
      });
    } catch (error) {
      if (
        error instanceof WebhookVerificationError ||
        error instanceof SyntaxError ||
        (error instanceof Error &&
          error.message.startsWith("Invalid webhook payload"))
      ) {
        return new Response("Invalid webhook", { status: 400 });
      }
      console.error("Creem webhook validation failed", error);
      return new Response("Webhook validation failed", { status: 500 });
    }
    if (!event.id) return new Response("Missing event ID", { status: 400 });

    try {
      if (event.type !== "checkout.completed") {
        await ctx.runMutation(internal.payments.processCheckoutWebhook, {
          eventId: event.id,
          eventType: event.type,
          payloadHash: await sha256(rawBody),
          requestId: "ignored_event",
          checkoutId: "ignored_event",
          productId: "ignored_event",
          configuredProductId: env.CREEM_PRODUCT_ID,
          units: 1,
          orderId: "ignored_event",
          orderStatus: "ignored",
        });
        return new Response("OK", { status: 200 });
      }
      const parsedCheckout = checkoutSchema.safeParse(event.data);
      if (!parsedCheckout.success) {
        return new Response("Invalid checkout", { status: 400 });
      }
      const checkout = parsedCheckout.data;
      const requestId = checkout.requestId ?? checkout.request_id;
      if (!requestId)
        return new Response("Missing request ID", { status: 400 });
      await ctx.runMutation(internal.payments.processCheckoutWebhook, {
        eventId: event.id,
        eventType: event.type,
        payloadHash: await sha256(rawBody),
        requestId,
        checkoutId: checkout.id,
        productId:
          typeof checkout.product === "string"
            ? checkout.product
            : checkout.product.id,
        configuredProductId: env.CREEM_PRODUCT_ID,
        units: checkout.units,
        orderId: checkout.order.id,
        orderStatus: checkout.order.status,
      });
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Creem webhook processing failed", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

export default http;
