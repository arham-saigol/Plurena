import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<{ uploadUrl: string; uploadGrantId: Id<"uploadGrants"> }> => {
    const user = await requireUser(ctx);
    const uploadGrantId: Id<"uploadGrants"> = await ctx.runMutation(internal.fileInternals.beginUpload, { clerkId: user.clerkId });
    return { uploadUrl: await ctx.storage.generateUploadUrl(), uploadGrantId };
  },
});

export const finalizeImage = action({
  args: { storageId: v.id("_storage"), uploadGrantId: v.id("uploadGrants") },
  handler: async (ctx, args): Promise<Id<"assets">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    try {
      const blob = await ctx.storage.get(args.storageId);
      if (!blob) throw new Error("UPLOAD_NOT_FOUND");
      if (blob.size > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_LARGE");
      if (!ALLOWED_IMAGE_TYPES.has(blob.type) || !matchesImageSignature(await blob.arrayBuffer(), blob.type)) {
        throw new Error("UNSUPPORTED_IMAGE_TYPE");
      }
      return await ctx.runMutation(internal.fileInternals.finalizeUpload, {
        clerkId: identity.subject,
        uploadGrantId: args.uploadGrantId,
        storageId: args.storageId,
        contentType: blob.type,
        size: blob.size,
      });
    } catch (error) {
      const canDelete = await ctx.runQuery(internal.fileInternals.canDeleteFailedUpload, {
        clerkId: identity.subject,
        uploadGrantId: args.uploadGrantId,
        storageId: args.storageId,
      });
      if (canDelete) await ctx.storage.delete(args.storageId);
      throw error;
    }
  },
});

export const discardAsset = mutation({
  args: { assetId: v.id("assets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.userId !== user._id) throw new Error("NOT_FOUND");
    const reference = await ctx.db.query("options").withIndex("by_storage", (q) => q.eq("storageId", asset.storageId)).first();
    if (reference) throw new Error("ASSET_IN_USE");
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(asset._id);
    return { deleted: true };
  },
});

function matchesImageSignature(buffer: ArrayBuffer, contentType: string) {
  const bytes = new Uint8Array(buffer);
  if (contentType === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
