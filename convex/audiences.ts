import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const criteria = v.object({
  name: v.optional(v.string()),
  locations: v.array(v.string()),
  description: v.string(),
  gender: v.union(v.literal("female"), v.literal("mixed"), v.literal("male")),
  minAge: v.number(),
  maxAge: v.number(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db.query("savedAudiences").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(50);
  },
});

export const save = mutation({
  args: { name: v.string(), criteria },
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
