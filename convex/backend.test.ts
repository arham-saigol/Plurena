/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.*s", "!./**/*.test.ts"]);

const aliceIdentity = {
  subject: "alice",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|alice",
  email: "alice@example.com",
  name: "Alice",
};

const draft = {
  name: "Homepage headline",
  question: "Which headline makes you most likely to learn more?",
  optionType: "text" as const,
  audience: "Operations leaders at growing software companies",
  respondentCount: 20 as const,
  respondentModel: "glm_5_2" as const,
  options: [
    {
      kind: "text" as const,
      label: "Option A",
      text: "Understand your audience before you ship.",
    },
    {
      kind: "text" as const,
      label: "Option B",
      text: "Make confident marketing decisions in minutes.",
    },
  ],
};

describe("authenticated financial invariants", () => {
  it("grants onboarding credit exactly once and isolates user data", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    const bob = t.withIdentity({
      subject: "bob",
      issuer: "https://clerk.test",
      tokenIdentifier: "https://clerk.test|bob",
    });
    await alice.mutation(api.users.syncCurrentUser, {
      email: aliceIdentity.email,
      name: aliceIdentity.name,
    });
    await alice.mutation(api.users.syncCurrentUser, {
      email: aliceIdentity.email,
      name: "Alice Updated",
    });
    await bob.mutation(api.users.syncCurrentUser, {});

    const testId = await alice.mutation(api.tests.saveDraft, draft);
    await expect(bob.query(api.tests.get, { testId })).rejects.toThrow(
      "Unauthorized",
    );
    expect((await alice.query(api.users.current)).balanceCents).toBe(600);
    expect(await alice.query(api.users.ledger, { limit: 10 })).toHaveLength(1);
  });

  it("launches from an immutable snapshot and charges only once", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    await alice.mutation(api.users.syncCurrentUser, {});
    const testId = await alice.mutation(api.tests.saveDraft, draft);

    const firstSnapshot = await alice.mutation(api.tests.launch, { testId });
    const secondSnapshot = await alice.mutation(api.tests.launch, { testId });
    expect(secondSnapshot).toBe(firstSnapshot);
    expect((await alice.query(api.users.current)).balanceCents).toBe(100);
    const entries = await alice.query(api.users.ledger, { limit: 10 });
    expect(
      entries.filter((entry) => entry.type === "test_charge"),
    ).toHaveLength(1);
  });

  it("credits a verified checkout exactly once across duplicate webhooks", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    await alice.mutation(api.users.syncCurrentUser, {});
    const requestId = "checkout_request_123456";
    await t.mutation(internal.payments.prepareCheckout, {
      tokenIdentifier: aliceIdentity.tokenIdentifier,
      quantity: 2,
      requestId,
    });
    const webhook = {
      eventId: "evt_123",
      eventType: "checkout.completed",
      payloadHash: "sha256-hash",
      requestId,
      checkoutId: "ch_123",
      productId: "prod_plurena",
      configuredProductId: "prod_plurena",
      units: 2,
      orderId: "order_123",
      orderStatus: "paid",
    };
    expect(
      await t.mutation(internal.payments.processCheckoutWebhook, webhook),
    ).toEqual({ duplicate: false, credited: true });
    expect(
      await t.mutation(internal.payments.processCheckoutWebhook, webhook),
    ).toEqual({ duplicate: true, credited: false });
    expect((await alice.query(api.users.current)).balanceCents).toBe(1_600);
    const entries = await alice.query(api.users.ledger, { limit: 10 });
    expect(entries.filter((entry) => entry.type === "top_up")).toHaveLength(1);
  });

  it("stores one response when respondent completion is delivered twice", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    await alice.mutation(api.users.syncCurrentUser, {});
    const testId = await alice.mutation(api.tests.saveDraft, draft);
    await alice.mutation(api.tests.launch, { testId });
    const batchId = await t.run(async (ctx) => {
      const batch = await ctx.db.query("personaBatches").first();
      if (!batch) throw new Error("Expected persona batch");
      return batch._id;
    });
    await t.mutation(internal.execution.claimPersonaBatch, { batchId });
    await t.mutation(internal.execution.completePersonaBatch, {
      batchId,
      personas: Array.from({ length: 20 }, (_, index) => ({
        displayName: `Panelist ${index + 1}`,
        background: `Relevant category background for panelist ${index + 1}`,
        goals: ["Make a sound decision"],
        motivations: ["Improve the current workflow"],
        frustrations: ["Unclear product claims"],
        decisionDrivers: ["Credible evidence"],
        familiarity: "considering" as const,
        behavioralTraits: ["Methodical", "Evidence seeking"],
        reasoningStyle: "Compares practical outcomes before deciding",
        priceSensitivity: "Moderate",
        soul: `I am panelist ${index + 1} and I need a distinct, defensible reason to change.`,
        uniquenessFingerprint: `unique-fingerprint-${index + 1}`,
      })),
    });
    const runnable = await t.run(async (ctx) => {
      const run = await ctx.db.query("respondentRuns").first();
      const option = await ctx.db.query("snapshotOptions").first();
      if (!run || !option) throw new Error("Expected respondent work");
      await ctx.db.patch("respondentRuns", run._id, {
        status: "running",
        attempts: 1,
      });
      return { runId: run._id, selectedOptionId: option._id };
    });
    const result = {
      ...runnable,
      reasons: [
        "It is clearer",
        "It is more specific",
        "It feels more credible",
      ],
      comparisons: ["The alternative is less concrete"],
      confidence: "high" as const,
      confidenceScore: 0.88,
      modelKey: "glm_5_2" as const,
      provider: "opencode_go" as const,
      startedAt: Date.now() - 100,
    };
    const firstResponse = await t.mutation(
      internal.execution.completeRespondent,
      result,
    );
    const duplicateResponse = await t.mutation(
      internal.execution.completeRespondent,
      result,
    );
    expect(duplicateResponse).toBe(firstResponse);
    const counts = await t.run(async (ctx) => ({
      responses: (await ctx.db.query("responses").collect()).length,
      progress: await ctx.db.query("testProgress").first(),
    }));
    expect(counts.responses).toBe(1);
    expect(counts.progress?.completedRespondents).toBe(1);
  });
});
