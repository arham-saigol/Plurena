import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const MAX_UPLOADS_PER_HOUR = 20;
const MAX_STORED_ASSETS = 100;
const ORPHANED_STORAGE_GRACE_MS = 24 * 60 * 60 * 1_000;
const CLEANUP_BATCH_SIZE = 50;

export const beginUpload = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId)).unique();
    if (!user) throw new Error("USER_NOT_INITIALIZED");
    const recent = await ctx.db.query("uploadGrants").withIndex("by_user_created", (q) =>
      q.eq("userId", user._id).gte("createdAt", Date.now() - 60 * 60 * 1_000),
    ).take(MAX_UPLOADS_PER_HOUR);
    if (recent.length >= MAX_UPLOADS_PER_HOUR) throw new Error("UPLOAD_RATE_LIMIT");
    const assets = await ctx.db.query("assets").withIndex("by_user", (q) => q.eq("userId", user._id)).take(MAX_STORED_ASSETS);
    if (assets.length >= MAX_STORED_ASSETS) throw new Error("ASSET_LIMIT_REACHED");
    const uploadGrantId = await ctx.db.insert("uploadGrants", { userId: user._id, status: "issued", createdAt: Date.now() });
    return uploadGrantId;
  },
});

export const finalizeUpload = internalMutation({
  args: {
    clerkId: v.string(),
    uploadGrantId: v.id("uploadGrants"),
    storageId: v.id("_storage"),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId)).unique();
    if (!user) throw new Error("USER_NOT_INITIALIZED");
    const grant = await ctx.db.get(args.uploadGrantId);
    if (!grant || grant.userId !== user._id || grant.status !== "issued") throw new Error("INVALID_UPLOAD_GRANT");
    const assets = await ctx.db.query("assets").withIndex("by_user", (q) => q.eq("userId", user._id)).take(MAX_STORED_ASSETS);
    if (assets.length >= MAX_STORED_ASSETS) throw new Error("ASSET_LIMIT_REACHED");
    const assetId = await ctx.db.insert("assets", {
      userId: user._id,
      storageId: args.storageId,
      uploadGrantId: args.uploadGrantId,
      contentType: args.contentType,
      size: args.size,
      createdAt: Date.now(),
    });
    await ctx.db.patch(grant._id, { status: "registered", registeredAt: Date.now() });
    return assetId;
  },
});

export const cleanupUnusedAssets = internalMutation({
  args: { cursor: v.optional(v.string()), cutoff: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ scanned: number; deleted: number; continued: boolean }> => {
    const cutoff = args.cutoff ?? Date.now() - ORPHANED_STORAGE_GRACE_MS;
    const page = await ctx.db.query("assets").withIndex("by_created", (q) => q.lt("createdAt", cutoff)).paginate({
      cursor: args.cursor ?? null,
      numItems: CLEANUP_BATCH_SIZE,
    });
    let deleted = 0;
    for (const asset of page.page) {
      const reference = await ctx.db.query("options").withIndex("by_storage", (q) => q.eq("storageId", asset.storageId)).first();
      if (!reference) {
        await ctx.storage.delete(asset.storageId);
        await ctx.db.delete(asset._id);
        deleted += 1;
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.fileInternals.cleanupUnusedAssets, { cursor: page.continueCursor, cutoff });
    }
    return { scanned: page.page.length, deleted, continued: !page.isDone };
  },
});

export const cleanupOrphanedStorage = internalMutation({
  args: { cursor: v.optional(v.string()), cutoff: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ scanned: number; deleted: number; continued: boolean }> => {
    const cutoff = args.cutoff ?? Date.now() - ORPHANED_STORAGE_GRACE_MS;
    const page = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .paginate({ cursor: args.cursor ?? null, numItems: CLEANUP_BATCH_SIZE });
    let deleted = 0;
    for (const file of page.page) {
      const asset = await ctx.db.query("assets").withIndex("by_storage", (q) => q.eq("storageId", file._id)).unique();
      if (!asset) {
        await ctx.storage.delete(file._id);
        deleted += 1;
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.fileInternals.cleanupOrphanedStorage, {
        cursor: page.continueCursor,
        cutoff,
      });
    }
    return { scanned: page.page.length, deleted, continued: !page.isDone };
  },
});
