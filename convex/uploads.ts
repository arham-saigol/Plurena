import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ABANDONED_UPLOAD_GRACE_MS = 60 * 60 * 1_000;
const CLEANUP_BATCH_SIZE = 50;
const ABANDONED_UPLOAD_SWEEP = "abandoned_uploads";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) throw new Error("Upload was not found");
    if (
      !metadata.contentType ||
      !ALLOWED_IMAGE_TYPES.has(metadata.contentType)
    ) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Upload must be a JPEG, PNG, or WebP image");
    }
    if (metadata.size > MAX_IMAGE_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Images must be 8 MB or smaller");
    }
    const filename = args.filename.trim().slice(0, 180);
    if (!filename) throw new Error("Filename is required");
    return await ctx.db.insert("uploadedAssets", {
      ownerId: user._id,
      storageId: args.storageId,
      filename,
      contentType: metadata.contentType,
      sizeBytes: metadata.size,
      createdAt: Date.now(),
    });
  },
});

export const removeUpload = mutation({
  args: { assetId: v.id("uploadedAssets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const asset = await ctx.db.get("uploadedAssets", args.assetId);
    if (!asset || asset.ownerId !== user._id) throw new Error("Unauthorized");
    const inUse = await ctx.db
      .query("testOptions")
      .withIndex("by_ownerId_and_storageId", (q) =>
        q.eq("ownerId", user._id).eq("storageId", asset.storageId),
      )
      .first();
    if (inUse) throw new Error("This image is used by a saved draft");
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete("uploadedAssets", asset._id);
    return null;
  },
});

export const startReclaimAbandonedUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sweep = await ctx.db
      .query("maintenanceSweeps")
      .withIndex("by_name", (q) => q.eq("name", ABANDONED_UPLOAD_SWEEP))
      .unique();
    const afterCreationTime = sweep?.afterCreationTime ?? 0;
    const cutoff = sweep?.cutoff ?? Date.now() - ABANDONED_UPLOAD_GRACE_MS;
    await ctx.scheduler.runAfter(
      0,
      internal.uploads.reclaimAbandonedUploads,
      sweep?.cursor
        ? { afterCreationTime, cursor: sweep.cursor, cutoff }
        : { afterCreationTime, cutoff },
    );
    return null;
  },
});

export const reclaimAbandonedUploads = internalMutation({
  args: {
    afterCreationTime: v.optional(v.number()),
    cursor: v.optional(v.string()),
    cutoff: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = args.cutoff ?? Date.now() - ABANDONED_UPLOAD_GRACE_MS;
    const sweep = await ctx.db
      .query("maintenanceSweeps")
      .withIndex("by_name", (q) => q.eq("name", ABANDONED_UPLOAD_SWEEP))
      .unique();
    const afterCreationTime = args.afterCreationTime ?? 0;
    if (
      sweep &&
      (sweep.afterCreationTime !== afterCreationTime ||
        sweep.cursor !== args.cursor ||
        (sweep.cursor !== undefined && sweep.cutoff !== cutoff))
    ) {
      return null;
    }
    const page = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) =>
        q.gte("_creationTime", afterCreationTime),
      )
      .order("asc")
      .paginate({ cursor: args.cursor ?? null, numItems: CLEANUP_BATCH_SIZE });

    let reachedCutoff = false;
    for (const storedFile of page.page) {
      if (storedFile._creationTime >= cutoff) {
        reachedCutoff = true;
        break;
      }
      const asset = await ctx.db
        .query("uploadedAssets")
        .withIndex("by_storageId", (q) => q.eq("storageId", storedFile._id))
        .first();
      if (asset) continue;
      await ctx.storage.delete(storedFile._id);
    }

    const sweepPatch =
      reachedCutoff || page.isDone
        ? {
            afterCreationTime: cutoff,
            cursor: undefined,
            cutoff: undefined,
            updatedAt: Date.now(),
          }
        : {
            afterCreationTime,
            cursor: page.continueCursor,
            cutoff,
            updatedAt: Date.now(),
          };
    if (sweep) {
      await ctx.db.patch("maintenanceSweeps", sweep._id, sweepPatch);
    } else {
      await ctx.db.insert("maintenanceSweeps", {
        name: ABANDONED_UPLOAD_SWEEP,
        ...sweepPatch,
      });
    }

    if (!reachedCutoff && !page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.uploads.reclaimAbandonedUploads,
        {
          afterCreationTime,
          cursor: page.continueCursor,
          cutoff,
        },
      );
    }
    return null;
  },
});

export const getAssetUrl = query({
  args: { assetId: v.id("uploadedAssets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const asset = await ctx.db.get("uploadedAssets", args.assetId);
    if (!asset || asset.ownerId !== user._id) throw new Error("Unauthorized");
    return await ctx.storage.getUrl(asset.storageId);
  },
});
