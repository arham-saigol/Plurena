import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

function dashboardBucketForStatus(status: Doc<"tests">["status"]) {
  if (
    status === "preparing_personas" ||
    status === "running_respondents" ||
    status === "synthesizing"
  ) {
    return "active" as const;
  }
  if (status === "completed" || status === "partially_failed") {
    return "completed" as const;
  }
  return "ignored" as const;
}

export async function syncDashboardStatsForTest(
  ctx: MutationCtx,
  test: Doc<"tests">,
  status: Doc<"tests">["status"],
) {
  const nextBucket = dashboardBucketForStatus(status);
  if (test.dashboardBucket === nextBucket) return;

  const activeDelta =
    Number(nextBucket === "active") - Number(test.dashboardBucket === "active");
  const completedDelta =
    Number(nextBucket === "completed") -
    Number(test.dashboardBucket === "completed");
  const stats = await ctx.db
    .query("dashboardStats")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", test.ownerId))
    .unique();
  if (!stats) throw new Error("Dashboard stats not found");
  await ctx.db.patch("dashboardStats", stats._id, {
    active: stats.active + activeDelta,
    completed: stats.completed + completedDelta,
    updatedAt: Date.now(),
  });
  await ctx.db.patch("tests", test._id, { dashboardBucket: nextBucket });
}
