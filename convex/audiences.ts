import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { audienceValidator } from "./lib/panel";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db.query("savedAudiences").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(50);
  },
});

export const save = mutation({
  args: { name: v.string(), criteria: audienceValidator },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = args.name.trim();
    if (!name || name.length > 60) throw new Error("INVALID_AUDIENCE_NAME");
    const locations = [...new Set(args.criteria.locations.map((item) => item.trim()).filter(Boolean))];
    const description = args.criteria.description.trim();
    if (!locations.length || locations.length > 10 || locations.some((item) => item.length > 80) || description.length < 4 || description.length > 600) throw new Error("INVALID_AUDIENCE");
    if (args.criteria.minAge < 18 || args.criteria.maxAge > 80 || args.criteria.minAge > args.criteria.maxAge) throw new Error("INVALID_AGE_RANGE");
    const existing = await ctx.db.query("savedAudiences").withIndex("by_user", (q) => q.eq("userId", user._id)).take(50);
    if (existing.length >= 50) throw new Error("AUDIENCE_LIMIT_REACHED");
    const now = Date.now();
    return await ctx.db.insert("savedAudiences", { userId: user._id, name, criteria: { ...args.criteria, name, locations, description }, createdAt: now, updatedAt: now });
  },
});

export const remove = mutation({
  args: { audienceId: v.id("savedAudiences") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const audience = await ctx.db.get(args.audienceId);
    if (!audience || audience.userId !== user._id) throw new Error("NOT_FOUND");
    await ctx.db.delete(audience._id);
    return { deleted: true };
  },
});
