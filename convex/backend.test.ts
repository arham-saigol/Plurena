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

function personaFixtures() {
  return Array.from({ length: 20 }, (_, index) => ({
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
  }));
}

async function launchedTestAsAlice() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity(aliceIdentity);
  await alice.mutation(api.users.syncCurrentUser, {});
  const testId = await alice.mutation(api.tests.saveDraft, draft);
  await alice.mutation(api.tests.launch, { testId });
  return { t, alice, testId };
}

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

  it("keeps draft progress in sync with respondent-count edits", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    await alice.mutation(api.users.syncCurrentUser, {});
    const testId = await alice.mutation(api.tests.saveDraft, draft);

    await alice.mutation(api.tests.saveDraft, {
      ...draft,
      testId,
      respondentCount: 50,
    });

    const details = await alice.query(api.tests.get, { testId });
    expect(details.test.respondentCount).toBe(50);
    expect(details.progress?.totalRespondents).toBe(50);
  });

  it("paginates every test beyond the first fifty", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    await alice.mutation(api.users.syncCurrentUser, {});
    await t.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      if (!user) throw new Error("Expected Alice's user record");
      for (let index = 0; index < 51; index += 1) {
        const now = Date.now() + index;
        const testId = await ctx.db.insert("tests", {
          ownerId: user._id,
          name: `Test ${index + 1}`,
          question: "Which option performs better?",
          optionType: "text",
          audience: "Test audience",
          respondentCount: 20,
          respondentModel: "glm_5_2",
          status: "completed",
          createdAt: now,
          updatedAt: now,
          completedAt: now,
        });
        await ctx.db.insert("testProgress", {
          testId,
          ownerId: user._id,
          status: "completed",
          phaseLabel: "Report ready",
          totalRespondents: 20,
          personaCount: 20,
          completedRespondents: 20,
          failedRespondents: 0,
          runningRespondents: 0,
          updatedAt: now,
        });
      }
    });

    const firstPage = await alice.query(api.tests.dashboard, {
      paginationOpts: { cursor: null, numItems: 50 },
    });
    const secondPage = await alice.query(api.tests.dashboard, {
      paginationOpts: {
        cursor: firstPage.continueCursor,
        numItems: 50,
      },
    });

    expect(firstPage.page).toHaveLength(50);
    expect(firstPage.isDone).toBe(false);
    expect(secondPage.page).toHaveLength(1);
    expect(secondPage.isDone).toBe(true);
  });

  it("deletes draft image assets only after their last reference", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    await alice.mutation(api.users.syncCurrentUser, {});
    const { sharedStorageId, uniqueStorageId, sharedAssetId, uniqueAssetId } =
      await t.run(async (ctx) => {
        const user = await ctx.db.query("users").first();
        if (!user) throw new Error("Expected Alice's user record");
        const sharedStorageId = await ctx.storage.store(new Blob(["shared"]));
        const uniqueStorageId = await ctx.storage.store(new Blob(["unique"]));
        const sharedAssetId = await ctx.db.insert("uploadedAssets", {
          ownerId: user._id,
          storageId: sharedStorageId,
          filename: "shared.png",
          contentType: "image/png",
          sizeBytes: 6,
          createdAt: Date.now(),
        });
        const uniqueAssetId = await ctx.db.insert("uploadedAssets", {
          ownerId: user._id,
          storageId: uniqueStorageId,
          filename: "unique.png",
          contentType: "image/png",
          sizeBytes: 6,
          createdAt: Date.now(),
        });
        return {
          sharedStorageId,
          uniqueStorageId,
          sharedAssetId,
          uniqueAssetId,
        };
      });
    const imageDraft = {
      ...draft,
      optionType: "image" as const,
      respondentModel: "minimax_m3" as const,
    };
    const firstTestId = await alice.mutation(api.tests.saveDraft, {
      ...imageDraft,
      options: [
        { kind: "image", label: "Shared", assetId: sharedAssetId },
        { kind: "image", label: "Unique", assetId: uniqueAssetId },
      ],
    });
    const secondTestId = await alice.mutation(api.tests.saveDraft, {
      ...imageDraft,
      options: [
        { kind: "image", label: "Shared A", assetId: sharedAssetId },
        { kind: "image", label: "Shared B", assetId: sharedAssetId },
      ],
    });

    await alice.mutation(api.tests.removeDraft, { testId: firstTestId });

    const afterFirstDelete = await t.run(async (ctx) => ({
      sharedAsset: await ctx.db.get("uploadedAssets", sharedAssetId),
      hasSharedBlob: (await ctx.storage.get(sharedStorageId)) !== null,
      uniqueAsset: await ctx.db.get("uploadedAssets", uniqueAssetId),
      hasUniqueBlob: (await ctx.storage.get(uniqueStorageId)) !== null,
    }));
    expect(afterFirstDelete.sharedAsset).not.toBeNull();
    expect(afterFirstDelete.hasSharedBlob).toBe(true);
    expect(afterFirstDelete.uniqueAsset).toBeNull();
    expect(afterFirstDelete.hasUniqueBlob).toBe(false);

    await alice.mutation(api.tests.removeDraft, { testId: secondTestId });

    const afterLastDelete = await t.run(async (ctx) => ({
      sharedAsset: await ctx.db.get("uploadedAssets", sharedAssetId),
      hasSharedBlob: (await ctx.storage.get(sharedStorageId)) !== null,
    }));
    expect(afterLastDelete.sharedAsset).toBeNull();
    expect(afterLastDelete.hasSharedBlob).toBe(false);
  });

  it("reclaims superseded, orphaned, and unfinalized image uploads", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity(aliceIdentity);
    await alice.mutation(api.users.syncCurrentUser, {});
    const uploads = await t.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      if (!user) throw new Error("Expected Alice's user record");
      const createAsset = async (filename: string) => {
        const storageId = await ctx.storage.store(
          new Blob([filename], { type: "image/png" }),
        );
        const assetId = await ctx.db.insert("uploadedAssets", {
          ownerId: user._id,
          storageId,
          filename,
          contentType: "image/png",
          sizeBytes: filename.length,
          createdAt: Date.now(),
        });
        return { assetId, storageId };
      };
      return {
        oldA: await createAsset("old-a.png"),
        oldB: await createAsset("old-b.png"),
        replacementA: await createAsset("replacement-a.png"),
        replacementB: await createAsset("replacement-b.png"),
        orphan: await createAsset("orphan.png"),
        unfinalizedStorageId: await ctx.storage.store(
          new Blob(["unfinalized"], { type: "image/png" }),
        ),
      };
    });
    const imageDraft = {
      ...draft,
      optionType: "image" as const,
      respondentModel: "minimax_m3" as const,
    };
    const testId = await alice.mutation(api.tests.saveDraft, {
      ...imageDraft,
      options: [
        { kind: "image", label: "Old A", assetId: uploads.oldA.assetId },
        { kind: "image", label: "Old B", assetId: uploads.oldB.assetId },
      ],
    });

    await alice.mutation(api.tests.saveDraft, {
      ...imageDraft,
      testId,
      options: [
        {
          kind: "image",
          label: "Replacement A",
          assetId: uploads.replacementA.assetId,
        },
        {
          kind: "image",
          label: "Replacement B",
          assetId: uploads.replacementB.assetId,
        },
      ],
    });
    await t.mutation(internal.uploads.reclaimAbandonedUploads, {
      cutoff: Date.now() + 60_000,
    });

    const result = await t.run(async (ctx) => ({
      oldA: await ctx.db.get("uploadedAssets", uploads.oldA.assetId),
      hasOldABlob: (await ctx.storage.get(uploads.oldA.storageId)) !== null,
      oldB: await ctx.db.get("uploadedAssets", uploads.oldB.assetId),
      hasOldBBlob: (await ctx.storage.get(uploads.oldB.storageId)) !== null,
      replacementA: await ctx.db.get(
        "uploadedAssets",
        uploads.replacementA.assetId,
      ),
      hasReplacementABlob:
        (await ctx.storage.get(uploads.replacementA.storageId)) !== null,
      orphan: await ctx.db.get("uploadedAssets", uploads.orphan.assetId),
      hasOrphanBlob: (await ctx.storage.get(uploads.orphan.storageId)) !== null,
      hasUnfinalizedBlob:
        (await ctx.storage.get(uploads.unfinalizedStorageId)) !== null,
    }));
    expect(result.oldA).toBeNull();
    expect(result.hasOldABlob).toBe(false);
    expect(result.oldB).toBeNull();
    expect(result.hasOldBBlob).toBe(false);
    expect(result.replacementA).not.toBeNull();
    expect(result.hasReplacementABlob).toBe(true);
    expect(result.orphan).toBeNull();
    expect(result.hasOrphanBlob).toBe(false);
    expect(result.hasUnfinalizedBlob).toBe(false);
  });

  it("resumes upload cleanup after its durable sweep watermark", async () => {
    const t = convexTest(schema, modules);
    const { firstStorageId, firstCutoff } = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob(["first"], { type: "image/png" }),
      );
      const metadata = await ctx.db.system.get("_storage", storageId);
      if (!metadata) throw new Error("Expected first upload metadata");
      return {
        firstStorageId: storageId,
        firstCutoff: metadata._creationTime + 0.1,
      };
    });
    await t.mutation(internal.uploads.reclaimAbandonedUploads, {
      cutoff: firstCutoff,
    });
    const afterCreationTime = await t.run(async (ctx) => {
      const sweep = await ctx.db
        .query("maintenanceSweeps")
        .withIndex("by_name", (q) => q.eq("name", "abandoned_uploads"))
        .unique();
      if (!sweep) throw new Error("Expected upload sweep watermark");
      return sweep.afterCreationTime;
    });
    const secondStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["second"], { type: "image/png" })),
    );

    await t.mutation(internal.uploads.reclaimAbandonedUploads, {
      afterCreationTime,
      cutoff: Date.now() + 60_000,
    });

    const result = await t.run(async (ctx) => ({
      hasFirst: (await ctx.storage.get(firstStorageId)) !== null,
      hasSecond: (await ctx.storage.get(secondStorageId)) !== null,
    }));
    expect(result.hasFirst).toBe(false);
    expect(result.hasSecond).toBe(false);
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
      personas: personaFixtures(),
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

describe("lease recovery", () => {
  it("fails and refunds a persona batch whose final lease expired", async () => {
    const { t, alice, testId } = await launchedTestAsAlice();
    const batchId = await t.run(async (ctx) => {
      const batch = await ctx.db.query("personaBatches").first();
      if (!batch) throw new Error("Expected persona batch");
      await ctx.db.patch("personaBatches", batch._id, {
        status: "running",
        attempts: 3,
        leaseExpiresAt: Date.now() - 1_000,
      });
      return batch._id;
    });

    await t.mutation(internal.execution.reclaimStaleWork, {});

    const state = await t.run(async (ctx) => ({
      batch: await ctx.db.get("personaBatches", batchId),
      test: await ctx.db.get("tests", testId),
      progress: await ctx.db
        .query("testProgress")
        .withIndex("by_testId", (q) => q.eq("testId", testId))
        .unique(),
    }));
    expect(state.batch?.status).toBe("failed");
    expect(state.test?.status).toBe("failed");
    expect(state.progress?.status).toBe("failed");
    expect((await alice.query(api.users.current)).balanceCents).toBe(600);
    expect(
      (await alice.query(api.users.ledger, { limit: 10 })).filter(
        (entry) => entry.type === "test_refund",
      ),
    ).toHaveLength(1);
  });

  it("fails an exhausted respondent and advances progress", async () => {
    const { t, testId } = await launchedTestAsAlice();
    const batchId = await t.run(async (ctx) => {
      const batch = await ctx.db.query("personaBatches").first();
      if (!batch) throw new Error("Expected persona batch");
      return batch._id;
    });
    await t.mutation(internal.execution.claimPersonaBatch, { batchId });
    await t.mutation(internal.execution.completePersonaBatch, {
      batchId,
      personas: personaFixtures(),
    });
    const runId = await t.run(async (ctx) => {
      const run = await ctx.db.query("respondentRuns").first();
      const progress = await ctx.db
        .query("testProgress")
        .withIndex("by_testId", (q) => q.eq("testId", testId))
        .unique();
      if (!run || !progress) throw new Error("Expected respondent work");
      await ctx.db.patch("respondentRuns", run._id, {
        status: "running",
        attempts: 3,
        leaseExpiresAt: Date.now() - 1_000,
      });
      await ctx.db.patch("testProgress", progress._id, {
        runningRespondents: 1,
      });
      return run._id;
    });

    await t.mutation(internal.execution.reclaimStaleWork, {});

    const state = await t.run(async (ctx) => ({
      run: await ctx.db.get("respondentRuns", runId),
      progress: await ctx.db
        .query("testProgress")
        .withIndex("by_testId", (q) => q.eq("testId", testId))
        .unique(),
    }));
    expect(state.run?.status).toBe("failed");
    expect(state.run?.completedAt).toBeTypeOf("number");
    expect(state.progress?.failedRespondents).toBe(1);
    expect(state.progress?.runningRespondents).toBe(0);
  });

  it("terminally fails exhausted group and final synthesis leases", async () => {
    const { t, testId } = await launchedTestAsAlice();
    const groupBatchId = await t.run(async (ctx) => {
      const test = await ctx.db.get("tests", testId);
      if (!test?.snapshotId) throw new Error("Expected test snapshot");
      await ctx.db.patch("tests", test._id, { status: "synthesizing" });
      return await ctx.db.insert("synthesisBatches", {
        testId,
        snapshotId: test.snapshotId,
        ownerId: test.ownerId,
        batchNumber: 0,
        responseIds: [],
        status: "running",
        attempts: 3,
        leaseExpiresAt: Date.now() - 1_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.mutation(internal.synthesis.reclaimStaleBatches, {});
    // Simulate the original worker completing after its lease was reclaimed.
    await t.mutation(internal.synthesis.completeBatch, {
      batchId: groupBatchId,
      summary: "Late result",
      themes: [],
      objections: [],
      segmentSignals: [],
    });
    const finalBatchId = await t.run(async (ctx) => {
      const group = await ctx.db.get("synthesisBatches", groupBatchId);
      const batches = await ctx.db
        .query("synthesisBatches")
        .withIndex("by_testId_and_batchNumber", (q) => q.eq("testId", testId))
        .take(5);
      const finalBatch = batches.find((batch) => batch.batchNumber === 10_000);
      if (!finalBatch) throw new Error("Expected final synthesis batch");
      expect(group?.status).toBe("failed");
      expect(group?.summary).toBe(
        "This response group could not be synthesized.",
      );
      await ctx.db.patch("synthesisBatches", finalBatch._id, {
        status: "running",
        attempts: 3,
        leaseExpiresAt: Date.now() - 1_000,
      });
      return finalBatch._id;
    });

    await t.mutation(internal.synthesis.reclaimStaleBatches, {});

    const finalBatch = await t.run((ctx) =>
      ctx.db.get("synthesisBatches", finalBatchId),
    );
    expect(finalBatch?.status).toBe("failed");
  });
});
