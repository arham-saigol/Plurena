"use client";

import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { CircleDollarSign, FlaskConical, Plus, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { TestList } from "@/components/test-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/utils";

export function Dashboard({ all = false }: { all?: boolean }) {
  const {
    results: tests,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.tests.dashboard,
    {},
    { initialNumItems: all ? 50 : 8 },
  );
  const user = useQuery(api.users.current);
  const summary = useQuery(api.tests.dashboardSummary, all ? "skip" : {});

  if (!user || status === "LoadingFirstPage") {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-60" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  const completed = summary?.completed;
  const active = summary?.active;
  const visible = all ? tests : tests.slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title={
          all ? "All tests" : "Good decisions start with a clear audience."
        }
        description={
          all
            ? "Browse drafts, active studies, and completed research."
            : "Create a test, define who the decision is for, and compare the evidence."
        }
        actions={
          <Button asChild variant="blue">
            <Link href="/app/tests/new">
              <Plus /> New test
            </Link>
          </Button>
        }
      />
      {!all && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Available balance",
              value: formatMoney(user.balanceCents),
              icon: CircleDollarSign,
              href: "/app/billing",
            },
            {
              label: "Active tests",
              value: active === undefined ? "…" : String(active),
              icon: FlaskConical,
              href: "/app/tests",
            },
            {
              label: "Reports ready",
              value: completed === undefined ? "…" : String(completed),
              icon: Sparkles,
              href: "/app/tests",
            },
          ].map(({ label, value, icon: Icon, href }) => (
            <Link href={href} key={label}>
              <Card className="hover:bg-accent/40 p-4 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="mt-1 text-xl font-semibold">{value}</p>
                  </div>
                  <span className="bg-accent grid size-9 place-items-center rounded-md">
                    <Icon className="size-4" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {all ? "Tests" : "Recent tests"}
          </h2>
          {!all && status !== "Exhausted" && (
            <Link
              href="/app/tests"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              View all
            </Link>
          )}
        </div>
        <TestList tests={visible} />
        {all && status !== "Exhausted" && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              disabled={status === "LoadingMore"}
              onClick={() => loadMore(50)}
            >
              {status === "LoadingMore" ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
