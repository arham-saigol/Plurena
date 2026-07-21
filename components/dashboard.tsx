"use client";

import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { ArrowRight, Coins, FlaskConical, Plus, Sparkles } from "lucide-react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { TestList } from "@/components/test-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCredits } from "@/lib/utils";

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
  const loadNextPage = useCallback(() => loadMore(50), [loadMore]);

  if (!user || status === "LoadingFirstPage") {
    return <DashboardSkeleton />;
  }

  const firstName = user.name?.split(" ")[0];
  const visible = all ? tests : tests.slice(0, 8);
  const active = summary?.active;
  const completed = summary?.completed;

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow={all ? "Research library" : "Research workspace"}
        title={
          all
            ? "Tests"
            : firstName
              ? `Welcome back, ${firstName}.`
              : "Your research workspace"
        }
        description={
          all
            ? "Find a decision, resume a draft, or review completed audience evidence."
            : "Move from a marketing question to a clear, audience-backed direction."
        }
        actions={
          <Button asChild variant="accent">
            <Link href="/app/tests/new">
              <Plus /> New test
            </Link>
          </Button>
        }
      />

      {!all && (
        <Card className="grid overflow-hidden sm:grid-cols-3 sm:divide-x">
          {[
            {
              label: "Available credits",
              value: formatCredits(user.creditBalance),
              hint: "1 credit per respondent",
              icon: Coins,
              href: "/app/billing",
            },
            {
              label: "In progress",
              value: active === undefined ? "…" : String(active),
              hint: "Running or synthesizing",
              icon: FlaskConical,
              href: "/app/tests",
            },
            {
              label: "Decisions ready",
              value: completed === undefined ? "…" : String(completed),
              hint: "Completed reports",
              icon: Sparkles,
              href: "/app/tests",
            },
          ].map(({ label, value, hint, icon: Icon, href }) => (
            <Link
              href={href}
              key={label}
              className="group hover:bg-accent/45 flex min-h-28 items-center justify-between gap-4 border-b p-5 transition last:border-b-0 sm:border-b-0 sm:p-6"
            >
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.04em] tabular-nums">
                  {value}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">{hint}</p>
              </div>
              <span className="bg-accent group-hover:bg-background grid size-10 place-items-center rounded-xl transition group-hover:shadow-[var(--shadow-sm)]">
                <Icon className="size-4.5" />
              </span>
            </Link>
          ))}
        </Card>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.025em]">
              {all ? "All research" : "Recent tests"}
            </h2>
            {!all && (
              <p className="text-muted-foreground mt-1 text-xs">
                Your latest decisions, ordered by recent activity.
              </p>
            )}
          </div>
          {!all && tests.length > 0 && (
            <Link
              href="/app/tests"
              className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-semibold transition"
            >
              View all
              <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
        <TestList
          tests={visible}
          showFilters={all}
          canLoadMore={all && status === "CanLoadMore"}
          loadingMore={all && status === "LoadingMore"}
          loadMore={loadNextPage}
        />
        {all && status !== "Exhausted" && (
          <div className="mt-5 flex justify-center">
            <Button
              variant="outline"
              disabled={status === "LoadingMore"}
              onClick={() => loadMore(50)}
            >
              {status === "LoadingMore" ? "Loading…" : "Load more tests"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
