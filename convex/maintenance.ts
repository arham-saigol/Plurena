import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const runRespondent = internal.jobs.runRespondent;
const recoverAssignment = internal.testInternals.recoverAssignment;
const synthesize = internal.jobs.synthesize;

export const recoverWork = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const queued = await ctx.db.query("assignments").withIndex("by_status_created", (q: any) =>
      q.eq("status", "queued").lte("createdAt", now - 2 * 60 * 1_000),
    ).take(50);
    for (const assignment of queued) await ctx.scheduler.runAfter(0, runRespondent, { assignmentId: assignment._id });

    const expired = await ctx.db.query("assignments").withIndex("by_status_lease", (q: any) =>
      q.eq("status", "running").lte("leaseExpiresAt", now),
    ).take(50);
    for (const assignment of expired) {
      if (assignment.leaseToken) await ctx.scheduler.runAfter(0, recoverAssignment, { assignmentId: assignment._id, leaseToken: assignment.leaseToken });
      else await ctx.db.patch(assignment._id, { status: "queued", leaseExpiresAt: undefined });
    }

    const stalledSynthesis = await ctx.db.query("tests").withIndex("by_status_launched", (q: any) =>
      q.eq("status", "synthesizing").lte("launchedAt", now - 5 * 60 * 1_000),
    ).take(20);
    for (const test of stalledSynthesis) await ctx.scheduler.runAfter(0, synthesize, { testId: test._id });

    return { queued: queued.length, expired: expired.length, stalledSynthesis: stalledSynthesis.length };
  },
});
