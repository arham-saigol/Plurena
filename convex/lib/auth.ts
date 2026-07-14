import type { GenericDatabaseReader } from "convex/server";
import { assertAuthenticated, assertOwner } from "./authorization";

export async function requireIdentity(ctx: { auth: { getUserIdentity(): Promise<any> } }) {
  return assertAuthenticated(await ctx.auth.getUserIdentity());
}

export async function requireUser(ctx: { auth: { getUserIdentity(): Promise<any> }; db: GenericDatabaseReader<any> }) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("USER_NOT_INITIALIZED");
  return user;
}

export async function requireOwned(ctx: { auth: { getUserIdentity(): Promise<any> }; db: GenericDatabaseReader<any> }, table: string, id: any) {
  const user = await requireUser(ctx);
  const normalizedId = ctx.db.normalizeId(table, id);
  if (!normalizedId) throw new Error("NOT_FOUND");
  const document = await ctx.db.get(table, normalizedId);
  if (!document) throw new Error("NOT_FOUND");
  assertOwner(String(document.userId), String(user._id));
  return { user, document };
}
