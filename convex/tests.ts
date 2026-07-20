import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireOwnedTest, requireUser } from "./lib/auth";
import { MODEL_CATALOG, MODEL_KEYS } from "./lib/models";
import { getPriceCents, RESPONDENT_COUNTS } from "./lib/pricing";
import {
  modelKeyValidator,
  optionInputValidator,
  optionTypeValidator,
  respondentCountValidator,
} from "./lib/validators";

const MAX_OPTIONS = 8;

async function removeAssetIfUnused(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  assetId: Id<"uploadedAssets">,
) {
  const asset = await ctx.db.get("uploadedAssets", assetId);
  if (!asset || asset.ownerId !== ownerId) return;
  const inUse = await ctx.db
    .query("testOptions")
    .withIndex("by_ownerId_and_storageId", (q) =>
      q.eq("ownerId", ownerId).eq("storageId", asset.storageId),
    )
    .first();
  if (inUse) return;
  await ctx.storage.delete(asset.storageId);
  await ctx.db.delete("uploadedAssets", asset._id);
}

function cleanRequired(value: string, label: string, maxLength: number) {
  const cleaned = value.trim();
  if (!cleaned) throw new Error(`${label} is required`);
  if (cleaned.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer`);
  }
  return cleaned;
}

function cleanOptional(value: string | undefined, maxLength: number) {
  const cleaned = value?.trim();
  if (!cleaned) return undefined;
  if (cleaned.length > maxLength) {
    throw new Error(
      `Additional context must be ${maxLength} characters or fewer`,
    );
  }
  return cleaned;
}

export const configuration = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return {
      pricing: RESPONDENT_COUNTS.map((respondentCount) => ({
        respondentCount,
        priceCents: getPriceCents(respondentCount),
      })),
      models: MODEL_KEYS.map((key) => ({
        key,
        label: MODEL_CATALOG[key].label,
        vision: MODEL_CATALOG[key].vision,
      })),
    };
  },
});

export const saveDraft = mutation({
  args: {
    testId: v.optional(v.id("tests")),
    name: v.string(),
    question: v.string(),
    optionType: optionTypeValidator,
    audience: v.string(),
    context: v.optional(v.string()),
    respondentCount: respondentCountValidator,
    respondentModel: modelKeyValidator,
    options: v.array(optionInputValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = cleanRequired(args.name, "Test name", 120);
    const question = cleanRequired(args.question, "Question", 500);
    const audience = cleanRequired(
      args.audience,
      "Audience description",
      4_000,
    );
    const context = cleanOptional(args.context, 4_000);
    if (args.options.length < 2 || args.options.length > MAX_OPTIONS) {
      throw new Error(`Tests require between 2 and ${MAX_OPTIONS} options`);
    }
    if (
      !MODEL_CATALOG[args.respondentModel].vision &&
      args.optionType === "image"
    ) {
      throw new Error("Image tests require a vision-capable respondent model");
    }
    if (args.options.some((option) => option.kind !== args.optionType)) {
      throw new Error("Text and image options cannot be mixed");
    }

    const now = Date.now();
    const replacedAssetIds = new Set<Id<"uploadedAssets">>();
    let testId = args.testId;
    if (testId) {
      const test = await ctx.db.get("tests", testId);
      if (!test || test.ownerId !== user._id) throw new Error("Unauthorized");
      if (test.status !== "draft")
        throw new Error("Running tests cannot be edited");
      await ctx.db.patch("tests", testId, {
        name,
        question,
        optionType: args.optionType,
        audience,
        context,
        respondentCount: args.respondentCount,
        respondentModel: args.respondentModel,
        updatedAt: now,
      });
      const existingProgress = await ctx.db
        .query("testProgress")
        .withIndex("by_testId", (q) => q.eq("testId", testId!))
        .unique();
      if (existingProgress) {
        await ctx.db.patch("testProgress", existingProgress._id, {
          totalRespondents: args.respondentCount,
          updatedAt: now,
        });
      }
      const existingOptions = await ctx.db
        .query("testOptions")
        .withIndex("by_testId_and_position", (q) => q.eq("testId", testId!))
        .take(MAX_OPTIONS + 1);
      for (const option of existingOptions) {
        if (option.assetId) replacedAssetIds.add(option.assetId);
        await ctx.db.delete("testOptions", option._id);
      }
    } else {
      testId = await ctx.db.insert("tests", {
        ownerId: user._id,
        name,
        question,
        optionType: args.optionType,
        audience,
        context,
        respondentCount: args.respondentCount,
        respondentModel: args.respondentModel,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("testProgress", {
        testId,
        ownerId: user._id,
        status: "draft",
        phaseLabel: "Draft",
        totalRespondents: args.respondentCount,
        personaCount: 0,
        completedRespondents: 0,
        failedRespondents: 0,
        runningRespondents: 0,
        updatedAt: now,
      });
    }

    for (let position = 0; position < args.options.length; position += 1) {
      const option = args.options[position];
      const label = cleanRequired(option.label, "Option label", 80);
      if (option.kind === "text") {
        const text = cleanRequired(option.text, "Option text", 5_000);
        await ctx.db.insert("testOptions", {
          testId,
          ownerId: user._id,
          position,
          label,
          text,
          createdAt: now,
        });
      } else {
        const asset = await ctx.db.get("uploadedAssets", option.assetId);
        if (!asset || asset.ownerId !== user._id)
          throw new Error("Unauthorized image");
        await ctx.db.insert("testOptions", {
          testId,
          ownerId: user._id,
          position,
          label,
          assetId: asset._id,
          storageId: asset.storageId,
          filename: asset.filename,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
          createdAt: now,
        });
      }
    }
    for (const assetId of replacedAssetIds) {
      await removeAssetIfUnused(ctx, user._id, assetId);
    }
    return testId;
  },
});

export const launch = mutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const { user, test } = await requireOwnedTest(ctx, args.testId);
    if (test.status !== "draft") {
      if (test.snapshotId) return test.snapshotId;
      throw new Error("This test has already started");
    }
    const options = await ctx.db
      .query("testOptions")
      .withIndex("by_testId_and_position", (q) => q.eq("testId", test._id))
      .take(MAX_OPTIONS + 1);
    if (options.length < 2 || options.length > MAX_OPTIONS) {
      throw new Error("The draft must have between 2 and 8 options");
    }
    const priceCents = getPriceCents(test.respondentCount);
    if (user.balanceCents < priceCents) throw new Error("Insufficient balance");

    const chargeKey = `test:${test._id}:charge`;
    const existingCharge = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_externalKey", (q) => q.eq("externalKey", chargeKey))
      .unique();
    if (existingCharge) throw new Error("This test has already been charged");

    const now = Date.now();
    const snapshotId = await ctx.db.insert("testSnapshots", {
      testId: test._id,
      ownerId: user._id,
      name: test.name,
      question: test.question,
      optionType: test.optionType,
      audience: test.audience,
      context: test.context,
      respondentCount: test.respondentCount,
      respondentModel: test.respondentModel,
      personaModel: "glm_5_2",
      synthesisModel: "glm_5_2",
      chargedPriceCents: priceCents,
      createdAt: now,
    });
    for (const option of options) {
      await ctx.db.insert("snapshotOptions", {
        snapshotId,
        testId: test._id,
        ownerId: user._id,
        originalOptionId: option._id,
        position: option.position,
        label: option.label,
        text: option.text,
        storageId: option.storageId,
        filename: option.filename,
        contentType: option.contentType,
        sizeBytes: option.sizeBytes,
      });
    }
    const resultingBalanceCents = user.balanceCents - priceCents;
    await ctx.db.patch("users", user._id, {
      balanceCents: resultingBalanceCents,
      updatedAt: now,
    });
    await ctx.db.insert("ledgerEntries", {
      ownerId: user._id,
      type: "test_charge",
      amountCents: -priceCents,
      resultingBalanceCents,
      reason: `Launched ${test.name}`,
      externalKey: chargeKey,
      testId: test._id,
      createdAt: now,
    });
    await ctx.db.patch("tests", test._id, {
      status: "preparing_personas",
      snapshotId,
      priceCents,
      launchedAt: now,
      updatedAt: now,
    });
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    if (!progress) throw new Error("Test progress record is missing");
    await ctx.db.patch("testProgress", progress._id, {
      status: "preparing_personas",
      phaseLabel: "Building your audience",
      totalRespondents: test.respondentCount,
      updatedAt: now,
    });
    const firstBatchId = await ctx.db.insert("personaBatches", {
      testId: test._id,
      snapshotId,
      ownerId: user._id,
      batchNumber: 0,
      requestedCount: Math.min(20, test.respondentCount),
      startIndex: 0,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.executionActions.generatePersonaBatch,
      {
        batchId: firstBatchId,
      },
    );
    return snapshotId;
  },
});

export const removeDraft = mutation({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const { test } = await requireOwnedTest(ctx, args.testId);
    if (test.status !== "draft") throw new Error("Only drafts can be deleted");
    const options = await ctx.db
      .query("testOptions")
      .withIndex("by_testId_and_position", (q) => q.eq("testId", test._id))
      .take(MAX_OPTIONS + 1);
    const assetIds = new Set(
      options.flatMap((option) => (option.assetId ? [option.assetId] : [])),
    );
    for (const option of options) {
      await ctx.db.delete("testOptions", option._id);
    }
    for (const assetId of assetIds) {
      await removeAssetIfUnused(ctx, test.ownerId, assetId);
    }
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    if (progress) await ctx.db.delete("testProgress", progress._id);
    await ctx.db.delete("tests", test._id);
    return null;
  },
});

export const dashboard = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const result = await ctx.db
      .query("tests")
      .withIndex("by_ownerId_and_updatedAt", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (test) => {
        const progress = await ctx.db
          .query("testProgress")
          .withIndex("by_testId", (q) => q.eq("testId", test._id))
          .unique();
        return { ...test, progress };
      }),
    );
    return { ...result, page };
  },
});

export const dashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const countStatus = async (status: Doc<"tests">["status"]) => {
      let count = 0;
      for await (const test of ctx.db
        .query("tests")
        .withIndex("by_ownerId_and_status_and_updatedAt", (q) =>
          q.eq("ownerId", user._id).eq("status", status),
        )) {
        void test;
        count += 1;
      }
      return count;
    };
    const [preparing, running, synthesizing, completed, partiallyFailed] =
      await Promise.all([
        countStatus("preparing_personas"),
        countStatus("running_respondents"),
        countStatus("synthesizing"),
        countStatus("completed"),
        countStatus("partially_failed"),
      ]);
    return {
      active: preparing + running + synthesizing,
      completed: completed + partiallyFailed,
    };
  },
});

export const get = query({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const { test } = await requireOwnedTest(ctx, args.testId);
    const progress = await ctx.db
      .query("testProgress")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    const options = test.snapshotId
      ? await ctx.db
          .query("snapshotOptions")
          .withIndex("by_snapshotId_and_position", (q) =>
            q.eq("snapshotId", test.snapshotId!),
          )
          .take(MAX_OPTIONS + 1)
      : await ctx.db
          .query("testOptions")
          .withIndex("by_testId_and_position", (q) => q.eq("testId", test._id))
          .take(MAX_OPTIONS + 1);
    const optionsWithUrls = await Promise.all(
      options.map(async (option) => ({
        ...option,
        imageUrl: option.storageId
          ? await ctx.storage.getUrl(option.storageId)
          : undefined,
      })),
    );
    const report = await ctx.db
      .query("synthesisReports")
      .withIndex("by_testId", (q) => q.eq("testId", test._id))
      .unique();
    return { test, progress, options: optionsWithUrls, report };
  },
});
