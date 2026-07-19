import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

export const getAssetUrl = query({
  args: { assetId: v.id("uploadedAssets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const asset = await ctx.db.get("uploadedAssets", args.assetId);
    if (!asset || asset.ownerId !== user._id) throw new Error("Unauthorized");
    return await ctx.storage.getUrl(asset.storageId);
  },
});
