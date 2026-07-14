import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("recover stalled panel work", { minutes: 1 }, internal.maintenance.recoverWork, {});

export default crons;
