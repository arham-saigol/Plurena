import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "reclaim abandoned uploads",
  { hours: 1 },
  internal.uploads.reclaimAbandonedUploads,
  {},
);

crons.interval(
  "reclaim stalled respondent work",
  { minutes: 2 },
  internal.execution.reclaimStaleWork,
  {},
);

crons.interval(
  "reclaim stalled synthesis work",
  { minutes: 2 },
  internal.synthesis.reclaimStaleBatches,
  {},
);

export default crons;
