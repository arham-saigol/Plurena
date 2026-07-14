import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireOwned, requireUser } from "./lib/auth";
import { modelForAssignment } from "./lib/modelRegistry";
import { audienceValidator, generatePanel, shuffleForRespondent } from "./lib/panel";
import { quotePanel } from "./lib/pricing";
import { stableFingerprint } from "./lib/idempotency";
import { applyCreditEntry } from "./lib/credits";

const optionValidator = v.object({
  label: v.string(),
  optionType: v.union(v.literal("text"), v.literal("image")),
  text: v.optional(v.string()),
  assetId: v.optional(v.id("assets")),
});

const runRespondent = internal.jobs.runRespondent;

export const launch = mutation({
  args: {
    clientRequestId: v.string(),
    title: v.string(),
    testType: v.union(v.literal("compare"), v.literal("question")),
    options: v.array(optionValidator),
    audience: audienceValidator,
    panelSize: v.number(),
    rerunOf: v.optional(v.id("tests")),
    reusePanel: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const fingerprint = stableFingerprint(args);
    const existing = await ctx.db.query("tests").withIndex("by_user_request", (q: any) =>
      q.eq("userId", user._id).eq("clientRequestId", args.clientRequestId),
    ).unique();
    if (existing) {
      if (existing.inputFingerprint !== fingerprint) throw new Error("IDEMPOTENCY_KEY_REUSED");
      return { testId: existing._id, charged: false };
    }

    const title = args.title.trim();
    const normalizedAudience = {
      ...args.audience,
      description: args.audience.description.trim(),
      locations: [...new Set(args.audience.locations.map((item) => item.trim()).filter(Boolean))],
    };
    if (title.length < 4 || title.length > 300) throw new Error("INVALID_TITLE");
    if (args.testType === "compare" && (args.options.length < 2 || args.options.length > 5)) throw new Error("COMPARE_REQUIRES_2_TO_5_OPTIONS");
    if (args.testType === "question" && args.options.length > 1) throw new Error("QUESTION_ACCEPTS_ONE_CONTEXT_ITEM");
    if (!normalizedAudience.locations.length || normalizedAudience.locations.length > 10 || normalizedAudience.locations.some((item) => item.length > 80)) throw new Error("INVALID_LOCATIONS");
    if (normalizedAudience.description.length < 4 || normalizedAudience.description.length > 600) throw new Error("INVALID_AUDIENCE_DESCRIPTION");
    if (args.audience.minAge < 18 || args.audience.maxAge > 80 || args.audience.minAge > args.audience.maxAge) throw new Error("INVALID_AGE_RANGE");
    const textCharacters = args.options.reduce((total, option) => total + (option.text?.trim().length ?? 0) + option.label.trim().length, 0);
    if (textCharacters > 12_000 || args.options.some((option) => (option.text?.trim().length ?? 0) > 5_000 || option.label.trim().length > 80)) throw new Error("CONTENT_TOO_LONG");
    const activeGroups = await Promise.all(["queued", "running", "synthesizing"].map((status) =>
      ctx.db.query("tests").withIndex("by_user_status", (q: any) => q.eq("userId", user._id).eq("status", status)).take(2),
    ));
    if (activeGroups.reduce((total, group) => total + group.length, 0) >= 2) throw new Error("TOO_MANY_ACTIVE_TESTS");
    const quote = quotePanel(args.panelSize);
    if (user.balanceCents < quote.priceCents) {
      throw new Error(JSON.stringify({ code: "INSUFFICIENT_CREDIT", requiredCents: quote.priceCents, balanceCents: user.balanceCents }));
    }

    let sourcePersonas: any[] = [];
    if (args.rerunOf) {
      const source = await ctx.db.get(args.rerunOf);
      if (!source || String(source.userId) !== String(user._id)) throw new Error("NOT_FOUND");
      if (args.reusePanel) {
        sourcePersonas = await ctx.db.query("personas").withIndex("by_test", (q) => q.eq("testId", args.rerunOf!)).collect();
        if (sourcePersonas.length !== args.panelSize) throw new Error("SAME_PANEL_SIZE_MISMATCH");
      }
    }

    const now = Date.now();
    const testId = await ctx.db.insert("tests", {
      userId: user._id,
      clientRequestId: args.clientRequestId,
      inputFingerprint: fingerprint,
      title,
      testType: args.testType,
      status: "queued",
      audience: normalizedAudience,
      panelSize: args.panelSize,
      priceCents: quote.priceCents,
      priceVersion: quote.priceVersion,
      completedCount: 0,
      failedCount: 0,
      rerunOf: args.rerunOf,
      reusedPanel: Boolean(args.rerunOf && args.reusePanel),
      launchedAt: now,
    });

    const optionIds: any[] = [];
    for (let position = 0; position < args.options.length; position += 1) {
      const option = args.options[position];
      const label = option.label.trim() || `Option ${position + 1}`;
      let storageId: any | undefined;
      if (option.optionType === "text") {
        if (!option.text?.trim() || option.text.trim().length > 5_000) throw new Error("INVALID_OPTION_TEXT");
      } else {
        if (!option.assetId) throw new Error("IMAGE_REQUIRED");
        const asset = await ctx.db.get(option.assetId);
        if (!asset || String(asset.userId) !== String(user._id)) throw new Error("NOT_FOUND");
        storageId = asset.storageId;
      }
      optionIds.push(await ctx.db.insert("options", {
        testId,
        userId: user._id,
        label,
        optionType: option.optionType,
        text: option.text?.trim(),
        storageId,
        position,
      }));
    }

    const generated = sourcePersonas.length
      ? sourcePersonas.map((persona) => ({ ...persona, sourcePersonaId: persona._id }))
      : generatePanel(normalizedAudience, args.panelSize, `${testId}:${now}`);
    const hasImages = args.options.some((option) => option.optionType === "image");
    for (let ordinal = 0; ordinal < generated.length; ordinal += 1) {
      const persona = generated[ordinal];
      const personaId = await ctx.db.insert("personas", {
        testId,
        userId: user._id,
        ordinal,
        age: persona.age,
        location: persona.location,
        gender: persona.gender,
        interests: persona.interests,
        habits: persona.habits,
        constraints: persona.constraints,
        pointOfView: persona.pointOfView,
        sourcePersonaId: persona.sourcePersonaId,
      });
      const model = modelForAssignment(ordinal, hasImages);
      const assignmentId = await ctx.db.insert("assignments", {
        testId,
        userId: user._id,
        personaId,
        ordinal,
        shuffledOptionIds: shuffleForRespondent(optionIds, `${testId}:${ordinal}`),
        modelKey: model.key,
        status: "queued",
        attemptCount: 0,
        createdAt: now,
      });
      await ctx.scheduler.runAfter(ordinal * 250, runRespondent, { assignmentId });
    }

    const balanceCents = applyCreditEntry({ balanceCents: user.balanceCents, appliedKeys: new Set<string>() }, `test:${testId}:charge`, -quote.priceCents).balanceCents;
    await ctx.db.insert("creditLedger", {
      userId: user._id,
      amountCents: -quote.priceCents,
      balanceAfterCents: balanceCents,
      kind: "test_charge",
      idempotencyKey: `test:${testId}:charge`,
      testId,
      note: `${args.panelSize}-respondent panel`,
      createdAt: now,
    });
    await ctx.db.patch(user._id, { balanceCents, updatedAt: now });
    return { testId, charged: true };
  },
});

export const list = query({
  args: {
    type: v.optional(v.union(v.literal("compare"), v.literal("question"))),
    status: v.optional(v.union(v.literal("queued"), v.literal("running"), v.literal("synthesizing"), v.literal("completed"), v.literal("partial"), v.literal("failed"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.type && args.status) {
      return await ctx.db.query("tests").withIndex("by_user_type_status_created", (q) => q.eq("userId", user._id).eq("testType", args.type!).eq("status", args.status!)).order("desc").paginate(args.paginationOpts);
    }
    if (args.type) return await ctx.db.query("tests").withIndex("by_user_type_created", (q) => q.eq("userId", user._id).eq("testType", args.type!)).order("desc").paginate(args.paginationOpts);
    if (args.status) return await ctx.db.query("tests").withIndex("by_user_status_created", (q) => q.eq("userId", user._id).eq("status", args.status!)).order("desc").paginate(args.paginationOpts);
    return await ctx.db.query("tests").withIndex("by_user_created", (q) => q.eq("userId", user._id)).order("desc").paginate(args.paginationOpts);
  },
});

export const get = query({
  args: { testId: v.id("tests") },
  handler: async (ctx, args) => {
    const { document: test } = await requireOwned(ctx, "tests", args.testId);
    const [options, aggregate, synthesis] = await Promise.all([
      ctx.db.query("options").withIndex("by_test", (q) => q.eq("testId", args.testId)).collect(),
      ctx.db.query("aggregates").withIndex("by_test", (q) => q.eq("testId", args.testId)).unique(),
      ctx.db.query("syntheses").withIndex("by_test", (q) => q.eq("testId", args.testId)).unique(),
    ]);
    const optionRows = await Promise.all(options.map(async (option) => {
      const asset = option.storageId ? await ctx.db.query("assets").withIndex("by_storage", (q) => q.eq("storageId", option.storageId!)).unique() : null;
      return { ...option, assetId: asset?._id, imageUrl: option.storageId ? await ctx.storage.getUrl(option.storageId) : undefined };
    }));
    return { test, options: optionRows.sort((a, b) => a.position - b.position), aggregate, synthesis };
  },
});

export const getResponses = query({
  args: { testId: v.id("tests"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireOwned(ctx, "tests", args.testId);
    const result = await ctx.db.query("responses").withIndex("by_test", (q) => q.eq("testId", args.testId)).paginate(args.paginationOpts);
    const page = await Promise.all(result.page.map(async (response) => ({ ...response, persona: await ctx.db.get(response.personaId) })));
    return { ...result, page };
  },
});
