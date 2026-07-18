import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { validatedAppOrigin, validatedCheckoutUrl } from "@/lib/checkout-security";
import { isValidTopUpAmount, TOP_UP_INCREMENT_CENTS } from "@/convex/lib/pricing";
import { z } from "zod";

export const runtime = "nodejs";

const { createIntent, claimCheckout, releaseCheckout, attachCheckout } = api.payments;
const bodySchema = z.object({ amountCents: z.number().int().refine(isValidTopUpAmount), requestId: z.string().uuid() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.CREEM_API_KEY || !process.env.CREEM_TOPUP_PRODUCT_ID || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    return Response.json({ error: "Billing has not been configured." }, { status: 503 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a supported top-up amount." }, { status: 400 });
  const token = await session.getToken({ template: "convex" });
  if (!token) return Response.json({ error: "Authentication token unavailable." }, { status: 401 });
  let claimedPayment: { paymentId: any; claimToken: string } | undefined;
  try {
    const intent: any = await fetchMutation(createIntent, parsed.data, { token });
    if (intent.checkoutUrl) return Response.json({ checkoutUrl: intent.checkoutUrl });
    const claimToken = crypto.randomUUID();
    const claim: any = await fetchMutation(claimCheckout, { paymentId: intent._id, claimToken }, { token });
    if (claim.checkoutUrl) return Response.json({ checkoutUrl: claim.checkoutUrl });
    if (!claim.claimed) return Response.json({ error: "Checkout is already being prepared. Try again in a moment." }, { status: 409 });
    claimedPayment = { paymentId: intent._id, claimToken };
    const user = await currentUser();
    const base = process.env.CREEM_TEST_MODE === "false" ? "https://api.creem.io" : "https://test-api.creem.io";
    const appUrl = validatedAppOrigin(request.url, process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV === "production");
    const checkoutResponse = await fetch(`${base}/v1/checkouts`, {
      method: "POST",
      headers: { "x-api-key": process.env.CREEM_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: process.env.CREEM_TOPUP_PRODUCT_ID,
        units: parsed.data.amountCents / TOP_UP_INCREMENT_CENTS,
        request_id: intent.requestId,
        success_url: `${appUrl}/dashboard?payment=processing`,
        customer: user?.primaryEmailAddress?.emailAddress ? { email: user.primaryEmailAddress.emailAddress } : undefined,
        metadata: { paymentId: String(intent._id), amountCents: String(intent.amountCents) },
      }),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (!checkoutResponse.ok) throw new Error(`Creem returned ${checkoutResponse.status}`);
    const checkout = await checkoutResponse.json() as { id?: string; checkout_url?: string };
    if (!checkout.id || !checkout.checkout_url) throw new Error("Creem returned an incomplete checkout.");
    const checkoutUrl = validatedCheckoutUrl(checkout.checkout_url);
    const saved: any = await fetchMutation(attachCheckout, { paymentId: intent._id, claimToken, checkoutId: checkout.id, checkoutUrl }, { token });
    return Response.json({ checkoutUrl: saved.checkoutUrl });
  } catch (error) {
    if (claimedPayment) await fetchMutation(releaseCheckout, claimedPayment, { token }).catch(() => undefined);
    console.error("Checkout creation failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Checkout could not start. Try again." }, { status: 502 });
  }
}
