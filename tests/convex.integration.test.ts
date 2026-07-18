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
    process.env.CLERK_WEBHOOK_FORWARD_SECRET = "test-clerk-forward-secret";
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

  it("does not expose model routing details through customer-facing test queries", async () => {
    const t = makeTest();
    const owner = t.withIdentity({ subject: "model-private", tokenIdentifier: "issuer|model-private" });
    const userId = await owner.mutation(api.users.ensureCurrent, {});
    const { testId } = await t.run(async (ctx) => {
      const testId = await ctx.db.insert("tests", {
        userId,
        clientRequestId: "model-private-request",
        inputFingerprint: "model-private-fingerprint",
        title: "Private model details",
        testType: "question",
        status: "completed",
        audience: { locations: ["US"], description: "Private audience", gender: "mixed", minAge: 20, maxAge: 40 },
        panelSize: 20,
        priceCents: 500,
        priceVersion: "panel-v1",
        completedCount: 1,
        failedCount: 19,
        reusedPanel: false,
        panelBuildLeaseToken: "private-panel-lease",
        panelBuildLeaseExpiresAt: Date.now() + 60_000,
        launchedAt: Date.now(),
        completedAt: Date.now(),
        synthesisLeaseToken: "private-synthesis-lease",
        synthesisLeaseExpiresAt: Date.now() + 60_000,
      });
      const personaId = await ctx.db.insert("personas", { testId, userId, ordinal: 0, age: 32, location: "US", gender: "female", interests: ["design"], habits: [], constraints: ["budget"], pointOfView: "Practical buyer" });
      const assignmentId = await ctx.db.insert("assignments", { testId, userId, personaId, ordinal: 0, shuffledOptionIds: [], modelKey: "internal-assignment-model", status: "completed", attemptCount: 1, createdAt: Date.now(), completedAt: Date.now() });
      await ctx.db.insert("responses", { testId, userId, assignmentId, personaId, answer: "Private answer", feedback: ["Private feedback"], provider: "internal-provider", model: "internal-response-model", latencyMs: 1, createdAt: Date.now() });
      await ctx.db.insert("syntheses", { testId, userId, summary: "Private summary", patterns: [], disagreements: [], nextActions: [], directness: 5, rhythm: 5, trust: 5, authenticity: 5, density: 5, provider: "internal-provider", model: "internal-synthesis-model", createdAt: Date.now() });
      return { testId };
    });

    const detail = await owner.query(api.tests.get, { testId });
    const responses = await owner.query(api.tests.getResponses, { testId, paginationOpts: { cursor: null, numItems: 20 } });

    expect(detail.synthesis).not.toHaveProperty("provider");
    expect(detail.synthesis).not.toHaveProperty("model");
    expect(detail.test).not.toHaveProperty("panelBuildLeaseToken");
    expect(detail.test).not.toHaveProperty("panelBuildLeaseExpiresAt");
    expect(detail.test).not.toHaveProperty("synthesisLeaseToken");
    expect(detail.test).not.toHaveProperty("synthesisLeaseExpiresAt");
    expect(responses.page[0]).not.toHaveProperty("provider");
    expect(responses.page[0]).not.toHaveProperty("model");
    expect(JSON.stringify({ detail, responses })).not.toContain("internal-response-model");
    expect(JSON.stringify({ detail, responses })).not.toContain("internal-synthesis-model");
  });

  it("registers an authenticated direct-storage image without an orphan", async () => {
    const t = makeTest();
    const user = t.withIdentity({ subject: "uploader", tokenIdentifier: "issuer|uploader" });
    await user.mutation(api.users.ensureCurrent, {});
    const grant = await user.mutation(api.files.generateUploadUrl, {});
    const storageId = await t.run(async (ctx) => await ctx.storage.store(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" })));
    const assetId = await user.action(api.files.finalizeImage, { storageId, uploadGrantId: grant.uploadGrantId });
    const result = await t.run(async (ctx) => ({ asset: await ctx.db.get(assetId), grants: await ctx.db.query("uploadGrants").collect() }));
    expect(result.asset?.contentType).toBe("image/png");
    expect(result.grants).toHaveLength(1);
    expect(result.grants[0].status).toBe("registered");
    expect(result.grants[0].storageId).toBe(storageId);
    const invalidGrant = await user.mutation(api.files.generateUploadUrl, {});
    const invalidStorageId = await t.run(async (ctx) => await ctx.storage.store(new Blob([new Uint8Array([1])], { type: "image/svg+xml" })));
    await expect(user.action(api.files.finalizeImage, { storageId: invalidStorageId, uploadGrantId: invalidGrant.uploadGrantId })).rejects.toThrow("UNSUPPORTED_IMAGE_TYPE");
    await expect(t.run(async (ctx) => (await ctx.storage.get(invalidStorageId)) !== null)).resolves.toBe(true);
  });

  it("creates and completes the full 250-person panel within transaction limits", async () => {
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
    expect(await t.mutation(internal.testInternals.beginPanelBuild, { testId: result.testId, leaseToken: "panel-lease" })).toBe(true);
    const blueprint = {
      version: "audience-simulation-v1" as const,
      audienceInterpretation: "Frequent online shoppers at different purchase and category-experience stages.",
      researchContext: "Evaluating improvements to an online shopping product.",
      assumptions: ["The brief does not specify a purchase horizon."],
      variationDimensions: ["experience", "purchase stage", "evidence threshold"],
      segments: [
        { name: "Explorers", targetShare: 34, summary: "Early-stage shoppers", categoryExperience: "low" as const, usageContext: "Shops occasionally", currentSolution: "General marketplaces", purchaseStage: "early research", goals: ["Understand choices", "Avoid mistakes"], painPoints: ["Unclear claims", "Too many options"], triggers: ["New need"], constraints: ["Limited time", "Fixed budget"], priorBeliefs: ["Reviews can be unreliable"], evidenceThresholds: ["Specific owner evidence"], uncertainties: ["Which features matter"], decisionCriteria: [{ criterion: "clarity", weight: 40 }, { criterion: "proof", weight: 35 }, { criterion: "price", weight: 25 }] },
        { name: "Comparers", targetShare: 33, summary: "Active comparison shoppers", categoryExperience: "moderate" as const, usageContext: "Compares before purchases", currentSolution: "Several shopping sites", purchaseStage: "actively comparing", goals: ["Find the best fit", "Reduce effort"], painPoints: ["Conflicting reviews", "Hidden tradeoffs"], triggers: ["Current option is inadequate"], constraints: ["Limited time", "Defined budget"], priorBeliefs: ["Claims need independent proof"], evidenceThresholds: ["Comparable specifications"], uncertainties: ["Long-term quality"], decisionCriteria: [{ criterion: "fit", weight: 40 }, { criterion: "proof", weight: 35 }, { criterion: "price", weight: 25 }] },
        { name: "Experienced buyers", targetShare: 33, summary: "Selective repeat buyers", categoryExperience: "high" as const, usageContext: "Buys within a familiar category", currentSolution: "A known incumbent", purchaseStage: "selective consideration", goals: ["Improve a specific weakness", "Keep what works"], painPoints: ["Marginal upgrades", "Marketing noise"], triggers: ["A concrete limitation"], constraints: ["Won't disrupt workflow", "Requires clear gain"], priorBeliefs: ["Most upgrades are incremental"], evidenceThresholds: ["Detailed comparative tests"], uncertainties: ["Reliability over time"], decisionCriteria: [{ criterion: "improvement", weight: 45 }, { criterion: "reliability", weight: 35 }, { criterion: "price", weight: 20 }] },
      ],
    };
    const profiles = Array.from({ length: 250 }, (_, ordinal) => ({
      ordinal,
      profile: {
        segmentName: blueprint.segments[ordinal % blueprint.segments.length].name,
        categoryExperience: blueprint.segments[ordinal % blueprint.segments.length].categoryExperience,
        usageContext: `Shopping situation ${ordinal}`,
        currentSolution: `Current solution ${ordinal}`,
        purchaseStage: "actively considering",
        goals: ["Make a suitable choice", "Avoid wasted effort"],
        painPoints: ["Unclear tradeoffs", "Weak supporting evidence"],
        trigger: `Decision trigger ${ordinal}`,
        decisionCriteria: [{ criterion: "fit", weight: 40 }, { criterion: "proof", weight: 35 }, { criterion: "effort", weight: 25 }],
        constraints: ["Limited time", "Defined budget"],
        priorBeliefs: ["Specific evidence is more useful than broad claims"],
        evidenceThreshold: "Concrete comparative evidence",
        uncertainties: ["Long-term performance"],
        responseStyle: "analytical" as const,
        pointOfView: `Looks for a concrete improvement ${ordinal}`,
      },
    }));
    expect(await t.mutation(internal.testInternals.completePanelBuild, { testId: result.testId, leaseToken: "panel-lease", blueprint, profiles })).toBe(true);
    const counts = await t.run(async (ctx) => {
      const personas = await ctx.db.query("personas").withIndex("by_test", (q) => q.eq("testId", result.testId)).collect();
      return {
        personas: personas.length,
        enrichedPersonas: personas.filter((persona) => persona.profile).length,
        assignments: (await ctx.db.query("assignments").withIndex("by_test", (q) => q.eq("testId", result.testId)).collect()).length,
        test: await ctx.db.get(result.testId),
        user: await ctx.db.get(userId),
      };
    });
    expect(counts.personas).toBe(250);
    expect(counts.enrichedPersonas).toBe(250);
    expect(counts.assignments).toBe(250);
    expect(counts.test?.panelReadyAt).toBeTypeOf("number");
    expect(counts.user?.balanceCents).toBe(1_200);
  });

  it("retries panel generation once and refunds an invalid panel exactly once", async () => {
    const t = makeTest();
    const user = t.withIdentity({ subject: "panel-refund", tokenIdentifier: "issuer|panel-refund" });
    const userId = await user.mutation(api.users.ensureCurrent, {});
    await t.run(async (ctx) => await ctx.db.patch(userId, { balanceCents: 1_100 }));
    const { testId } = await user.mutation(api.tests.launch, {
      clientRequestId: "panel-refund-request",
      title: "Which product direction is more useful?",
      testType: "compare",
      options: [
        { label: "First", optionType: "text", text: "First direction" },
        { label: "Second", optionType: "text", text: "Second direction" },
      ],
      audience: { locations: ["US"], description: "People actively comparing products", gender: "mixed", minAge: 20, maxAge: 50 },
      panelSize: 20,
    });
    await expect(user.mutation(api.tests.launch, {
      clientRequestId: "unfinished-panel-rerun",
      title: "Which product direction is more useful?",
      testType: "compare",
      options: [
        { label: "First", optionType: "text", text: "First direction" },
        { label: "Second", optionType: "text", text: "Second direction" },
      ],
      audience: { locations: ["US"], description: "People actively comparing products", gender: "mixed", minAge: 20, maxAge: 50 },
      panelSize: 20,
      rerunOf: testId,
      reusePanel: true,
    })).rejects.toThrow("SAME_PANEL_NOT_READY");
    expect(await t.mutation(internal.testInternals.beginPanelBuild, { testId, leaseToken: "first-lease" })).toBe(true);
    expect(await t.mutation(internal.testInternals.retryPanelBuild, { testId, leaseToken: "first-lease" })).toBe(true);
    expect(await t.mutation(internal.testInternals.beginPanelBuild, { testId, leaseToken: "second-lease" })).toBe(true);
    expect(await t.mutation(internal.testInternals.retryPanelBuild, { testId, leaseToken: "second-lease" })).toBe(false);
    expect(await t.mutation(internal.testInternals.retryPanelBuild, { testId, leaseToken: "second-lease" })).toBe(false);
    const result = await t.run(async (ctx) => ({
      test: await ctx.db.get(testId),
      user: await ctx.db.get(userId),
      ledger: await ctx.db.query("creditLedger").withIndex("by_user_created", (q) => q.eq("userId", userId)).collect(),
      assignments: await ctx.db.query("assignments").withIndex("by_test", (q) => q.eq("testId", testId)).collect(),
    }));
    expect(result.test?.status).toBe("failed");
    expect(result.user?.balanceCents).toBe(1_100);
    expect(result.ledger.filter((entry) => entry.kind === "test_refund")).toHaveLength(1);
    expect(new Set(result.assignments.map((assignment) => assignment.status))).toEqual(new Set(["failed"]));
  });

  it("accepts only $5 top-up increments from $5 through $500", async () => {
    const t = makeTest();
    const buyer = t.withIdentity({ subject: "custom-top-up", tokenIdentifier: "issuer|custom-top-up" });
    await buyer.mutation(api.users.ensureCurrent, {});
    expect(await buyer.mutation(api.payments.createIntent, { requestId: "minimum-top-up", amountCents: 500 })).toMatchObject({ amountCents: 500 });
    expect(await buyer.mutation(api.payments.createIntent, { requestId: "maximum-top-up", amountCents: 50_000 })).toMatchObject({ amountCents: 50_000 });
    await expect(buyer.mutation(api.payments.createIntent, { requestId: "partial-increment", amountCents: 750 })).rejects.toThrow("INVALID_TOP_UP");
    await expect(buyer.mutation(api.payments.createIntent, { requestId: "above-maximum", amountCents: 50_500 })).rejects.toThrow("INVALID_TOP_UP");
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

  it("returns comparison options in canonical order for synthesis", async () => {
    const t = makeTest();
    const testId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { clerkId: "synthesis-order", tokenIdentifier: "issuer|synthesis-order", balanceCents: 0, createdAt: Date.now(), updatedAt: Date.now() });
      const testId = await ctx.db.insert("tests", {
        userId,
        clientRequestId: "synthesis-order-request",
        inputFingerprint: "synthesis-order-fingerprint",
        title: "Which option is clearer?",
        testType: "compare",
        status: "synthesizing",
        audience: { locations: ["US"], description: "Research audience", gender: "mixed", minAge: 20, maxAge: 40 },
        panelSize: 20,
        priceCents: 500,
        priceVersion: "panel-v1",
        completedCount: 20,
        failedCount: 0,
        reusedPanel: false,
        launchedAt: Date.now(),
      });
      await ctx.db.insert("options", { testId, userId, position: 1, label: "Second", optionType: "text", text: "Second option" });
      await ctx.db.insert("options", { testId, userId, position: 0, label: "First", optionType: "text", text: "First option" });
      return testId;
    });

    const bundle = await t.mutation(internal.testInternals.aggregate, { testId });

    expect(bundle?.options.map((option) => option.label)).toEqual(["First", "Second"]);
  });

  it("refunds a zero-response panel exactly once", async () => {
    const t = makeTest();
    const { userId, testId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { clerkId: "refund-owner", tokenIdentifier: "issuer|refund-owner", balanceCents: 0, createdAt: Date.now(), updatedAt: Date.now() });
      const testId = await ctx.db.insert("tests", {
        userId,
        clientRequestId: "refund-request",
        inputFingerprint: "refund-fingerprint",
        title: "A panel with no usable responses",
        testType: "question",
        status: "synthesizing",
        audience: { locations: ["US"], description: "Research audience", gender: "mixed", minAge: 20, maxAge: 40 },
        panelSize: 20,
        priceCents: 500,
        priceVersion: "panel-v1",
        completedCount: 0,
        failedCount: 20,
        reusedPanel: false,
        launchedAt: Date.now(),
        synthesisLeaseToken: "refund-lease",
        synthesisLeaseExpiresAt: Date.now() + 60_000,
      });
      await ctx.db.insert("creditLedger", { userId, amountCents: -500, balanceAfterCents: 0, kind: "test_charge", idempotencyKey: `test:${testId}:charge`, testId, createdAt: Date.now() });
      return { userId, testId };
    });
    const synthesis = {
      testId,
      leaseToken: "refund-lease",
      summary: "No respondents returned usable evidence for this panel.",
      patterns: ["No usable evidence was returned."],
      disagreements: [],
      nextActions: ["Check provider configuration and rerun."],
      directness: 8,
      rhythm: 8,
      trust: 8,
      authenticity: 8,
      density: 8,
      provider: "local",
      model: "evidence-fallback",
      evidenceResponseCount: 0,
      omittedResponseCount: 0,
    };
    await t.mutation(internal.testInternals.saveSynthesis, synthesis);
    await t.mutation(internal.testInternals.saveSynthesis, synthesis);
    const result = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      test: await ctx.db.get(testId),
      ledger: await ctx.db.query("creditLedger").withIndex("by_user_created", (q) => q.eq("userId", userId)).collect(),
    }));
    expect(result.test?.status).toBe("failed");
    expect(result.user?.balanceCents).toBe(500);
    expect(result.ledger.filter((entry) => entry.kind === "test_refund")).toHaveLength(1);
  });

  it("caps welcome-credit claims across accounts per UTC day", async () => {
    const t = makeTest();
    for (let index = 0; index < 20; index += 1) {
      const user = t.withIdentity({ subject: `promo-${index}`, tokenIdentifier: `issuer|promo-${index}` });
      await user.mutation(api.users.ensureCurrent, {});
      await expect(user.mutation(api.users.completeOnboarding, { goals: ["validate-ideas"], integrationPlans: ["manual"] })).resolves.toMatchObject({ claimed: true });
    }
    const limited = t.withIdentity({ subject: "promo-limited", tokenIdentifier: "issuer|promo-limited" });
    await limited.mutation(api.users.ensureCurrent, {});
    await expect(limited.mutation(api.users.completeOnboarding, { goals: ["validate-ideas"], integrationPlans: ["manual"] })).rejects.toThrow("PROMOTION_DAILY_LIMIT_REACHED");
  });

  it("paginates through retained test history", async () => {
    const t = makeTest();
    const owner = t.withIdentity({ subject: "history-owner", tokenIdentifier: "issuer|history-owner" });
    const userId = await owner.mutation(api.users.ensureCurrent, {});
    await t.run(async (ctx) => {
      for (let index = 0; index < 105; index += 1) {
        await ctx.db.insert("tests", {
          userId,
          clientRequestId: `history-${index}`,
          inputFingerprint: `fingerprint-${index}`,
          title: `Historical test ${index}`,
          testType: "question",
          status: "completed",
          audience: { locations: ["US"], description: "Research audience", gender: "mixed", minAge: 20, maxAge: 40 },
          panelSize: 20,
          priceCents: 500,
          priceVersion: "panel-v1",
          completedCount: 20,
          failedCount: 0,
          reusedPanel: false,
          launchedAt: Date.now() + index,
          completedAt: Date.now() + index,
        });
      }
    });
    let cursor: string | null = null;
    let total = 0;
    do {
      const page: { page: unknown[]; isDone: boolean; continueCursor: string } = await owner.query(api.tests.list, { paginationOpts: { cursor, numItems: 40 } });
      total += page.page.length;
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    expect(total).toBe(105);
  });

  it("erases account data and storage through a resumable Clerk deletion", async () => {
    const t = makeTest();
    const owner = t.withIdentity({ subject: "delete-owner", tokenIdentifier: "issuer|delete-owner", email: "delete@example.com" });
    const userId = await owner.mutation(api.users.ensureCurrent, {});
    const storageId = await t.run(async (ctx) => await ctx.storage.store(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" })));
    await t.run(async (ctx) => {
      const grantId = await ctx.db.insert("uploadGrants", { userId, storageId, status: "registered", createdAt: Date.now(), registeredAt: Date.now() });
      await ctx.db.insert("assets", { userId, storageId, uploadGrantId: grantId, contentType: "image/png", size: 8, createdAt: Date.now() });
      await ctx.db.insert("savedAudiences", { userId, name: "Private audience", criteria: { locations: ["US"], description: "Private research audience", gender: "mixed", minAge: 20, maxAge: 40 }, createdAt: Date.now(), updatedAt: Date.now() });
      await ctx.db.insert("onboardingAnswers", { userId, goals: ["validate-ideas"], integrationPlans: ["manual"], submittedAt: Date.now() });
      await ctx.db.insert("creditLedger", { userId, amountCents: 600, balanceAfterCents: 600, kind: "onboarding_bonus", idempotencyKey: "delete-ledger", createdAt: Date.now() });
      await ctx.db.insert("payments", { userId, requestId: "delete-payment", amountCents: 1000, currency: "USD", status: "pending", createdAt: Date.now() });
      const testId = await ctx.db.insert("tests", {
        userId, clientRequestId: "delete-test", inputFingerprint: "delete-fingerprint", title: "Confidential study", testType: "question", status: "completed",
        audience: { locations: ["US"], description: "Private research audience", gender: "mixed", minAge: 20, maxAge: 40 }, panelSize: 20, priceCents: 500,
        priceVersion: "panel-v1", completedCount: 1, failedCount: 19, reusedPanel: false, launchedAt: Date.now(), completedAt: Date.now(),
      });
      const optionId = await ctx.db.insert("options", { testId, userId, label: "Private image", optionType: "image", storageId, position: 0 });
      const personaId = await ctx.db.insert("personas", { testId, userId, ordinal: 0, age: 30, location: "US", gender: "female", interests: [], habits: [], constraints: [], pointOfView: "Private" });
      const assignmentId = await ctx.db.insert("assignments", { testId, userId, personaId, ordinal: 0, shuffledOptionIds: [optionId], modelKey: "test", status: "completed", attemptCount: 1, createdAt: Date.now(), completedAt: Date.now() });
      await ctx.db.insert("responses", { testId, userId, assignmentId, personaId, answer: "Private answer", feedback: ["Private feedback"], provider: "test", model: "test", latencyMs: 1, createdAt: Date.now() });
      await ctx.db.insert("modelAttempts", { testId, assignmentId, provider: "test", model: "test", attempt: 1, status: "succeeded", createdAt: Date.now() });
      await ctx.db.insert("panelBuildAttempts", { testId, stage: "blueprint", buildAttempt: 1, provider: "test", model: "test", attempt: 1, status: "succeeded", latencyMs: 1, createdAt: Date.now() });
      await ctx.db.insert("synthesisAttempts", { testId, provider: "test", model: "test", attempt: 1, status: "succeeded", latencyMs: 1, createdAt: Date.now() });
      await ctx.db.insert("aggregates", { testId, userId, kind: "open_ended", data: {}, responseCount: 1, generatedAt: Date.now() });
      await ctx.db.insert("aggregates", { testId, userId, kind: "open_ended", data: {}, responseCount: 1, generatedAt: Date.now() });
      await ctx.db.insert("syntheses", { testId, userId, summary: "Private summary", patterns: [], disagreements: [], nextActions: [], directness: 5, rhythm: 5, trust: 5, authenticity: 5, density: 5, provider: "test", model: "test", createdAt: Date.now() });
      await ctx.db.insert("syntheses", { testId, userId, summary: "Private summary", patterns: [], disagreements: [], nextActions: [], directness: 5, rhythm: 5, trust: 5, authenticity: 5, density: 5, provider: "test", model: "test", createdAt: Date.now() });
    });
    await t.mutation(api.users.requestAccountDeletion, { forwardSecret: "test-clerk-forward-secret", clerkId: "delete-owner" });
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const request = await t.run(async (ctx) => await ctx.db.query("accountDeletionRequests").withIndex("by_clerk_id", (q) => q.eq("clerkId", "delete-owner")).unique());
      if (!request) break;
      await t.mutation(internal.users.continueAccountDeletion, { requestId: request._id });
    }
    const remaining = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      uploadGrants: await ctx.db.query("uploadGrants").collect(),
      audiences: await ctx.db.query("savedAudiences").collect(),
      onboardingAnswers: await ctx.db.query("onboardingAnswers").collect(),
      ledger: await ctx.db.query("creditLedger").collect(),
      payments: await ctx.db.query("payments").collect(),
      tests: await ctx.db.query("tests").collect(),
      options: await ctx.db.query("options").collect(),
      personas: await ctx.db.query("personas").collect(),
      assignments: await ctx.db.query("assignments").collect(),
      responses: await ctx.db.query("responses").collect(),
      attempts: await ctx.db.query("modelAttempts").collect(),
      panelBuildAttempts: await ctx.db.query("panelBuildAttempts").collect(),
      synthesisAttempts: await ctx.db.query("synthesisAttempts").collect(),
      aggregates: await ctx.db.query("aggregates").collect(),
      syntheses: await ctx.db.query("syntheses").collect(),
      assets: await ctx.db.query("assets").collect(),
      file: await ctx.storage.get(storageId),
    }));
    expect(remaining).toMatchObject({
      user: null,
      uploadGrants: [],
      audiences: [],
      onboardingAnswers: [],
      ledger: [],
      payments: [],
      tests: [],
      options: [],
      personas: [],
      assignments: [],
      responses: [],
      attempts: [],
      panelBuildAttempts: [],
      synthesisAttempts: [],
      aggregates: [],
      syntheses: [],
      assets: [],
      file: null,
    });
    await expect(t.mutation(api.users.requestAccountDeletion, { forwardSecret: "test-clerk-forward-secret", clerkId: "delete-owner" })).resolves.toEqual({ status: "complete" });
  });
});
