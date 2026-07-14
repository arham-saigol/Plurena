import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { z } from "zod";

export const runtime = "nodejs";

const applyWebhook = api.payments.applyWebhook;
const eventSchema = z.object({
  id: z.string().min(1),
  eventType: z.string(),
  object: z.object({
    id: z.string().min(1),
    request_id: z.string().min(1),
    status: z.string(),
    order: z.object({
      id: z.string().optional(),
      amount: z.number().int().positive(),
      currency: z.string(),
      status: z.string(),
    }),
    product: z.union([z.string(), z.object({ id: z.string() })]),
    customer: z.union([z.string(), z.object({ id: z.string() })]).optional(),
  }),
});

export async function POST(request: Request) {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  const forwardSecret = process.env.PAYMENT_WEBHOOK_FORWARD_SECRET;
  if (!secret || !forwardSecret) return new Response("Webhook not configured", { status: 503 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 64 * 1024) return new Response("Payload too large", { status: 413 });
  let rawBuffer: Buffer;
  try {
    rawBuffer = await readLimitedBody(request, 64 * 1024);
  } catch {
    return new Response("Payload too large", { status: 413 });
  }
  const signature = request.headers.get("creem-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBuffer).digest("hex");
  if (!safeEqual(signature, expected)) return new Response("Invalid signature", { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(rawBuffer.toString("utf8")); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return new Response("Invalid payload", { status: 400 });
  if (parsed.data.eventType !== "checkout.completed") return Response.json({ accepted: true, ignored: true });
  const object = parsed.data.object;
  const productId = typeof object.product === "string" ? object.product : object.product.id;
  if (productId !== process.env.CREEM_TOPUP_PRODUCT_ID || object.status !== "completed" || object.order.status !== "paid") {
    return new Response("Payment validation failed", { status: 400 });
  }
  const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
  try {
    const result = await fetchMutation(applyWebhook, {
      forwardSecret,
      eventId: parsed.data.id,
      requestId: object.request_id,
      checkoutId: object.id,
      orderId: object.order.id,
      customerId,
      amountCents: object.order.amount,
      currency: object.order.currency,
    });
    return Response.json({ accepted: true, ...result });
  } catch (error) {
    console.error("Creem webhook persistence failed", error instanceof Error ? error.message : "Unknown error");
    return new Response("Webhook processing failed", { status: 500 });
  }
}

async function readLimitedBody(request: Request, limit: number) {
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new Error("PAYLOAD_TOO_LARGE"); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function safeEqual(left: string, right: string) {
  try {
    const a = Buffer.from(left, "hex"); const b = Buffer.from(right, "hex");
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  } catch { return false; }
}
