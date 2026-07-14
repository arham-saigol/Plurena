import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const storeImage = action({
  args: { bytes: v.bytes(), contentType: v.string() },
  handler: async (ctx, args): Promise<Id<"assets">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    if (!ALLOWED_IMAGE_TYPES.has(args.contentType) || !matchesImageSignature(args.bytes, args.contentType)) throw new Error("UNSUPPORTED_IMAGE_TYPE");
    if (args.bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_LARGE");

    const grant: { userId: Id<"users">; uploadGrantId: Id<"uploadGrants"> } = await ctx.runMutation(internal.fileInternals.beginUpload, { clerkId: identity.subject });
    let storageId: Id<"_storage"> | undefined;
    try {
      storageId = await ctx.storage.store(new Blob([args.bytes], { type: args.contentType }));
      return await ctx.runMutation(internal.fileInternals.finalizeUpload, {
        ...grant,
        storageId,
        contentType: args.contentType,
        size: args.bytes.byteLength,
      });
    } catch (error) {
      if (storageId) await ctx.storage.delete(storageId);
      throw error;
    }
  },
});

function matchesImageSignature(buffer: ArrayBuffer, contentType: string) {
  const bytes = new Uint8Array(buffer);
  if (contentType === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
