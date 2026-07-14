import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { fetchMutation } from "convex/nextjs";
import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const forwardSecret = process.env.CLERK_WEBHOOK_FORWARD_SECRET;
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET || !forwardSecret) {
    return new Response("Webhook not configured", { status: 503 });
  }
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }
  if (event.type !== "user.deleted") return Response.json({ accepted: true, ignored: true });
  if (!event.data.id) return new Response("Missing user id", { status: 400 });
  try {
    const result = await fetchMutation(api.users.requestAccountDeletion, { forwardSecret, clerkId: event.data.id });
    return Response.json({ accepted: true, ...result });
  } catch (error) {
    console.error("Clerk deletion persistence failed", error instanceof Error ? error.message : "Unknown error");
    return new Response("Account deletion could not be scheduled", { status: 500 });
  }
}
