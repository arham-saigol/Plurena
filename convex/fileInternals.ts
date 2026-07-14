import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const MAX_UPLOADS_PER_HOUR = 20;
const MAX_STORED_ASSETS = 100;

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
    return { userId: user._id, uploadGrantId };
  },
});

export const finalizeUpload = internalMutation({
  args: {
    userId: v.id("users"),
    uploadGrantId: v.id("uploadGrants"),
    storageId: v.id("_storage"),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const grant = await ctx.db.get(args.uploadGrantId);
    if (!grant || grant.userId !== args.userId || grant.status !== "issued") throw new Error("INVALID_UPLOAD_GRANT");
    const assets = await ctx.db.query("assets").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(MAX_STORED_ASSETS);
    if (assets.length >= MAX_STORED_ASSETS) throw new Error("ASSET_LIMIT_REACHED");
    const assetId = await ctx.db.insert("assets", {
      userId: args.userId,
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
