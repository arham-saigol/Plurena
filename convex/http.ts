import {
  constructWebhookEvent,
  WebhookVerificationError,
} from "creem/webhooks";
import { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";

const entityReferenceSchema = z.union([
  z.string(),
  z.looseObject({ id: z.string() }),
]);

const productSchema = z.union([
  z.string(),
  z.looseObject({
    id: z.string(),
    price: z.number().int().positive().optional(),
  }),
]);

const checkoutSchema = z.object({
  id: z.string(),
  requestId: z.string().optional(),
  request_id: z.string().optional(),
  units: z.number().int().positive(),
  product: productSchema,
  order: z.object({
    id: z.string(),
    product: z.string().optional(),
    amount: z.number().int().positive(),
    currency: z.string(),
    status: z.string(),
    transaction: z.string().nullish(),
  }),
});

const transactionSchema = z.looseObject({
  id: z.string(),
  amount: z.number().int().positive(),
  amount_paid: z.number().int().positive().nullish(),
  refunded_amount: z.number().int().nonnegative().nullish(),
  status: z.string(),
  order: z.string().nullish(),
});

const refundSchema = z.object({
  id: z.string(),
  status: z.string(),
  refund_amount: z.number().int().positive(),
  transaction: transactionSchema,
  checkout: entityReferenceSchema.optional(),
  order: entityReferenceSchema.optional(),
});

const disputeSchema = z.object({
  id: z.string(),
  amount: z.number().int().positive(),
  transaction: transactionSchema,
  checkout: entityReferenceSchema.optional(),
  order: entityReferenceSchema.optional(),
});

function entityId(value: z.infer<typeof entityReferenceSchema> | undefined) {
  return typeof value === "string" ? value : value?.id;
}

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
    if (!env.CREEM_WEBHOOK_SECRET) {
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

    const payloadHash = await sha256(rawBody);
    try {
      if (event.type === "checkout.completed") {
        const parsedCheckout = checkoutSchema.safeParse(event.data);
        if (!parsedCheckout.success) {
          return new Response("Invalid checkout", { status: 400 });
        }
        const checkout = parsedCheckout.data;
        const requestId = checkout.requestId ?? checkout.request_id;
        if (!requestId) {
          return new Response("Missing request ID", { status: 400 });
        }
        const productId =
          typeof checkout.product === "string"
            ? checkout.product
            : checkout.product.id;
        await ctx.runMutation(internal.payments.processCheckoutWebhook, {
          eventId: event.id,
          payloadHash,
          requestId,
          checkoutId: checkout.id,
          productId,
          productPriceCents:
            typeof checkout.product === "string"
              ? undefined
              : checkout.product.price,
          units: checkout.units,
          orderId: checkout.order.id,
          orderProductId: checkout.order.product,
          orderAmountCents: checkout.order.amount,
          orderCurrency: checkout.order.currency,
          orderStatus: checkout.order.status,
          transactionId: checkout.order.transaction ?? undefined,
        });
      } else if (event.type === "refund.created") {
        const parsedRefund = refundSchema.safeParse(event.data);
        if (!parsedRefund.success) {
          return new Response("Invalid refund", { status: 400 });
        }
        const refund = parsedRefund.data;
        await ctx.runMutation(internal.payments.processPaymentReversal, {
          eventId: event.id,
          eventType: "refund.created",
          payloadHash,
          reversalId: refund.id,
          checkoutId: entityId(refund.checkout),
          orderId:
            entityId(refund.order) ?? refund.transaction.order ?? undefined,
          transactionId: refund.transaction.id,
          amountCents: refund.refund_amount,
          transactionAmountPaidCents:
            refund.transaction.amount_paid ?? refund.transaction.amount,
          cumulativeRefundedAmountCents:
            refund.transaction.refunded_amount ?? undefined,
          paymentStatus: refund.status,
        });
      } else if (event.type === "dispute.created") {
        const parsedDispute = disputeSchema.safeParse(event.data);
        if (!parsedDispute.success) {
          return new Response("Invalid dispute", { status: 400 });
        }
        const dispute = parsedDispute.data;
        await ctx.runMutation(internal.payments.processPaymentReversal, {
          eventId: event.id,
          eventType: "dispute.created",
          payloadHash,
          reversalId: dispute.id,
          checkoutId: entityId(dispute.checkout),
          orderId:
            entityId(dispute.order) ?? dispute.transaction.order ?? undefined,
          transactionId: dispute.transaction.id,
          amountCents: dispute.amount,
          transactionAmountPaidCents:
            dispute.transaction.amount_paid ?? dispute.transaction.amount,
          cumulativeRefundedAmountCents:
            dispute.transaction.refunded_amount ?? undefined,
          paymentStatus: dispute.transaction.status,
        });
      } else {
        await ctx.runMutation(internal.payments.recordIgnoredWebhook, {
          eventId: event.id,
          eventType: event.type,
          payloadHash,
        });
      }
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Creem webhook processing failed", error);
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

export default http;
