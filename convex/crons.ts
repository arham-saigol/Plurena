import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("recover stalled panel work", { minutes: 1 }, internal.maintenance.recoverWork, {});
crons.interval("clean up orphaned storage", { hours: 1 }, internal.fileInternals.cleanupOrphanedStorage, {});
crons.interval("clean up unused image assets", { hours: 1 }, internal.fileInternals.cleanupUnusedAssets, {});
crons.interval("resume account deletions", { minutes: 5 }, internal.users.resumeAccountDeletions, {});

export default crons;
