import { TableAggregate } from "@convex-dev/aggregate";
import type { WithoutSystemFields } from "convex/server";
import { components } from "../_generated/api";
import type { DataModel, Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type LedgerNamespace = [
  Doc<"ledgerEntries">["ownerId"],
  Doc<"ledgerEntries">["type"],
];

export const ledgerAggregate = new TableAggregate<{
  Namespace: LedgerNamespace;
  Key: number;
  DataModel: DataModel;
  TableName: "ledgerEntries";
}>(components.ledgerAggregate, {
  namespace: (entry) => [entry.ownerId, entry.type],
  sortKey: (entry) => entry.createdAt,
  sumValue: (entry) => entry.amountCredits,
});

export async function insertLedgerEntry(
  ctx: MutationCtx,
  value: WithoutSystemFields<Doc<"ledgerEntries">>,
) {
  const id = await ctx.db.insert("ledgerEntries", value);
  await ledgerAggregate.insert(ctx, (await ctx.db.get("ledgerEntries", id))!);
  return id;
}
