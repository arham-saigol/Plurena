import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { PANEL_VERSION } from "./lib/panel";

const runRespondent = internal.jobs.runRespondent;
const buildPanel = internal.jobs.buildPanel;
const recoverAssignment = internal.testInternals.recoverAssignment;
const synthesize = internal.jobs.synthesize;

export const recoverWork = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const queued = await ctx.db.query("assignments").withIndex("by_status_created", (q: any) =>
      q.eq("status", "queued").lte("createdAt", now - 2 * 60 * 1_000),
    ).take(50);
    let queuedReady = 0;
    for (const assignment of queued) {
      const test = await ctx.db.get(assignment.testId);
      if (test?.panelVersion === PANEL_VERSION && !test.panelReadyAt) continue;
      await ctx.scheduler.runAfter(0, runRespondent, { assignmentId: assignment._id });
      queuedReady += 1;
    }

    const stalledPanelBuilds = await ctx.db.query("tests").withIndex("by_status_launched", (q: any) =>
      q.eq("status", "queued").lte("launchedAt", now - 2 * 60 * 1_000),
    ).take(20);
    let panelBuilds = 0;
    for (const test of stalledPanelBuilds) {
      if (test.panelVersion !== PANEL_VERSION || test.panelReadyAt) continue;
      await ctx.scheduler.runAfter(0, buildPanel, { testId: test._id });
      panelBuilds += 1;
    }

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

    return { queued: queuedReady, panelBuilds, expired: expired.length, stalledSynthesis: stalledSynthesis.length };
  },
});
