import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (!user) throw new Error("User profile is not initialized");
  return user;
}

export async function requireOwnedTest(
  ctx: QueryCtx | MutationCtx,
  testId: Id<"tests">,
) {
  const user = await requireUser(ctx);
  const test = await ctx.db.get("tests", testId);
  if (!test || test.ownerId !== user._id) throw new Error("Unauthorized");
  return { user, test };
}
