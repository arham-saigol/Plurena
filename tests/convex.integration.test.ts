import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "@/convex/schema";
import { api, internal } from "@/convex/_generated/api";
import { convexModules } from "./convex.setup";

function makeTest() {
  return convexTest({ schema, modules: convexModules, transactionLimits: true });
}

describe("Convex transaction boundaries", () => {
  beforeEach(() => {
    process.env.PAYMENT_WEBHOOK_FORWARD_SECRET = "test-forward-secret";
  });

  it("awards onboarding credit exactly once", async () => {
    const t = makeTest();
    const user = t.withIdentity({ subject: "clerk-a", tokenIdentifier: "issuer|clerk-a", email: "a@example.com" });
    await user.mutation(api.users.ensureCurrent, {});
    const first = await user.mutation(api.users.completeOnboarding, { goals: ["validate-ideas"], integrationPlans: ["manual"] });
    const second = await user.mutation(api.users.completeOnboarding, { goals: ["validate-ideas"], integrationPlans: ["manual"] });
    expect(first).toMatchObject({ claimed: true, balanceCents: 600 });
    expect(second).toMatchObject({ claimed: false, balanceCents: 600 });
    const ledger = await user.query(api.users.ledger, {});
    expect(ledger).toHaveLength(1);
    expect(ledger[0].amountCents).toBe(600);
  });

  it("hides another user's test", async () => {
    const t = makeTest();
    const owner = t.withIdentity({ subject: "owner", tokenIdentifier: "issuer|owner" });
    const stranger = t.withIdentity({ subject: "stranger", tokenIdentifier: "issuer|stranger" });
    const ownerId = await owner.mutation(api.users.ensureCurrent, {});
    await stranger.mutation(api.users.ensureCurrent, {});
    const testId = await t.run(async (ctx) => await ctx.db.insert("tests", {
      userId: ownerId,
      clientRequestId: "request-1",
      inputFingerprint: "fingerprint",
      title: "A private test",
      testType: "question",
      status: "completed",
      audience: { locations: ["US"], description: "Private audience", gender: "mixed", minAge: 20, maxAge: 40 },
      panelSize: 20,
      priceCents: 500,
      priceVersion: "panel-v1",
      completedCount: 20,
      failedCount: 0,
      reusedPanel: false,
      launchedAt: Date.now(),
      completedAt: Date.now(),
    }));
    await expect(stranger.query(api.tests.get, { testId })).rejects.toThrow("NOT_FOUND");
  });

  it("stores an authenticated image through the bounded action without an orphan", async () => {
    const t = makeTest();
    const user = t.withIdentity({ subject: "uploader", tokenIdentifier: "issuer|uploader" });
    await user.mutation(api.users.ensureCurrent, {});
    const assetId = await user.action(api.files.storeImage, { bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer, contentType: "image/png" });
    const result = await t.run(async (ctx) => ({ asset: await ctx.db.get(assetId), grants: await ctx.db.query("uploadGrants").collect() }));
    expect(result.asset?.contentType).toBe("image/png");
    expect(result.grants).toHaveLength(1);
    expect(result.grants[0].status).toBe("registered");
    await expect(user.action(api.files.storeImage, { bytes: new Uint8Array([1]).buffer, contentType: "image/svg+xml" })).rejects.toThrow("UNSUPPORTED_IMAGE_TYPE");
  });

  it("creates the full 250-person panel within transaction limits", async () => {
    const t = makeTest();
    const user = t.withIdentity({ subject: "large-panel", tokenIdentifier: "issuer|large-panel" });
    const userId = await user.mutation(api.users.ensureCurrent, {});
    await t.run(async (ctx) => await ctx.db.patch(userId, { balanceCents: 5_000 }));
    const result = await user.mutation(api.tests.launch, {
      clientRequestId: "large-panel-request",
      title: "What would improve this product?",
      testType: "question",
      options: [],
      audience: { locations: ["United States", "Canada"], description: "Frequent online shoppers who compare product reviews", gender: "mixed", minAge: 20, maxAge: 65 },
      panelSize: 250,
      reusePanel: false,
    });
    const counts = await t.run(async (ctx) => ({
      personas: (await ctx.db.query("personas").withIndex("by_test", (q) => q.eq("testId", result.testId)).collect()).length,
      assignments: (await ctx.db.query("assignments").withIndex("by_test", (q) => q.eq("testId", result.testId)).collect()).length,
      user: await ctx.db.get(userId),
    }));
    expect(counts.personas).toBe(250);
    expect(counts.assignments).toBe(250);
    expect(counts.user?.balanceCents).toBe(1_000);
  });

  it("does not create another checkout for a terminal payment", async () => {
    const t = makeTest();
    const buyer = t.withIdentity({ subject: "terminal-buyer", tokenIdentifier: "issuer|terminal-buyer" });
    const userId = await buyer.mutation(api.users.ensureCurrent, {});
    const paymentId = await t.run(async (ctx) => await ctx.db.insert("payments", { userId, requestId: "terminal-request", amountCents: 1_000, currency: "USD", status: "completed", checkoutAttemptCount: 1, creemCheckoutId: "checkout-complete", createdAt: Date.now(), completedAt: Date.now() }));
    await expect(buyer.mutation(api.payments.createIntent, { requestId: "terminal-request", amountCents: 1_000 })).rejects.toThrow("PAYMENT_ALREADY_TERMINAL");
    await expect(buyer.mutation(api.payments.claimCheckout, { paymentId, claimToken: "claim" })).rejects.toThrow("PAYMENT_ALREADY_TERMINAL");
  });

  it("credits a signed-forwarded payment only once", async () => {
    const t = makeTest();
    const { userId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { clerkId: "buyer", tokenIdentifier: "issuer|buyer", balanceCents: 0, createdAt: Date.now(), updatedAt: Date.now() });
      await ctx.db.insert("payments", { userId, requestId: "payment-request", amountCents: 1_000, currency: "USD", status: "pending", checkoutAttemptCount: 0, creemCheckoutId: "checkout-1", createdAt: Date.now() });
      return { userId };
    });
    const payload = { forwardSecret: "test-forward-secret", eventId: "event-1", requestId: "payment-request", checkoutId: "checkout-1", orderId: "order-1", amountCents: 1_000, currency: "USD" };
    expect(await t.mutation(api.payments.applyWebhook, payload)).toMatchObject({ duplicate: false, balanceCents: 1_000 });
    expect(await t.mutation(api.payments.applyWebhook, payload)).toMatchObject({ duplicate: true });
    const result = await t.run(async (ctx) => ({ user: await ctx.db.get(userId), ledger: await ctx.db.query("creditLedger").withIndex("by_user_created", (q) => q.eq("userId", userId)).collect() }));
    expect(result.user?.balanceCents).toBe(1_000);
    expect(result.ledger).toHaveLength(1);
  });

  it("persists synthesis without leaking its lease token", async () => {
    const t = makeTest();
    const { testId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { clerkId: "owner", tokenIdentifier: "issuer|owner", balanceCents: 0, createdAt: Date.now(), updatedAt: Date.now() });
      const testId = await ctx.db.insert("tests", {
        userId,
        clientRequestId: "request-2",
        inputFingerprint: "fingerprint-2",
        title: "Synthesis test",
        testType: "question",
        status: "synthesizing",
        audience: { locations: ["US"], description: "Research audience", gender: "mixed", minAge: 20, maxAge: 40 },
        panelSize: 20,
        priceCents: 500,
        priceVersion: "panel-v1",
        completedCount: 20,
        failedCount: 0,
        reusedPanel: false,
        launchedAt: Date.now(),
        synthesisLeaseToken: "lease-secret",
        synthesisLeaseExpiresAt: Date.now() + 60_000,
      });
      return { testId };
    });
    await t.mutation(internal.testInternals.saveSynthesis, {
      testId,
      leaseToken: "lease-secret",
      summary: "Respondents consistently preferred the clearer option.",
      patterns: ["Clear language improved confidence."],
      disagreements: [],
      nextActions: ["Test the clearer revision."],
      directness: 8,
      rhythm: 8,
      trust: 8,
      authenticity: 8,
      density: 8,
      provider: "local",
      model: "test",
      evidenceResponseCount: 20,
      omittedResponseCount: 0,
    });
    const stored = await t.run(async (ctx) => ({ test: await ctx.db.get(testId), synthesis: await ctx.db.query("syntheses").withIndex("by_test", (q) => q.eq("testId", testId)).unique() }));
    expect(stored.test?.status).toBe("completed");
    expect(stored.synthesis?.summary).toContain("preferred");
    expect(stored.synthesis).not.toHaveProperty("leaseToken");
  });
});
