"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  ImageIcon,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { Progress } from "@/components/ui/progress";

export type DashboardTest = Doc<"tests"> & {
  progress: Doc<"testProgress"> | null;
};

const statusCopy: Record<
  Doc<"tests">["status"],
  { label: string; tone: "neutral" | "blue" | "green" | "amber" | "red" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  preparing_personas: { label: "Building audience", tone: "blue" },
  running_respondents: { label: "Collecting responses", tone: "blue" },
  synthesizing: { label: "Finding patterns", tone: "amber" },
  completed: { label: "Decision ready", tone: "green" },
  partially_failed: { label: "Partial results", tone: "amber" },
  failed: { label: "Needs attention", tone: "red" },
};

export function TestList({
  tests,
  showFilters = false,
  canLoadMore = false,
  loadingMore = false,
  loadMore,
}: {
  tests: Array<DashboardTest>;
  showFilters?: boolean;
  canLoadMore?: boolean;
  loadingMore?: boolean;
  loadMore?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const query = search.trim().toLowerCase();
  const filtering = showFilters && Boolean(query || filter !== "all");

  useEffect(() => {
    if (filtering && canLoadMore) loadMore?.();
  }, [canLoadMore, filtering, loadMore]);

  if (tests.length === 0) {
    return (
      <div className="fine-grid rounded-2xl border border-dashed px-6 py-16 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[var(--green-soft)] text-[var(--green)]">
          <FlaskConical className="size-5" />
        </div>
        <h2 className="mt-4 text-lg font-bold tracking-[-0.025em]">
          Start with one decision
        </h2>
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm leading-6">
          Add the options you are debating and describe the audience the choice
          needs to move.
        </p>
        <Button asChild variant="accent" className="mt-5">
          <Link href="/app/tests/new">
            <Plus /> Create your first test
          </Link>
        </Button>
      </div>
    );
  }

  const filtered = tests.filter((test) => {
    const matchesSearch =
      !query || `${test.name} ${test.question}`.toLowerCase().includes(query);
    const matchesFilter =
      filter === "all" ||
      (filter === "active"
        ? [
            "preparing_personas",
            "running_respondents",
            "synthesizing",
          ].includes(test.status)
        : filter === "ready"
          ? ["completed", "partially_failed"].includes(test.status)
          : test.status === filter);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by test or question"
              aria-label="Search tests"
            />
          </div>
          <Select
            className="sm:w-44"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter tests by status"
          >
            <option value="all">Every status</option>
            <option value="active">In progress</option>
            <option value="ready">Decision ready</option>
            <option value="draft">Drafts</option>
            <option value="failed">Needs attention</option>
          </Select>
        </div>
      )}

      <div className="bg-card overflow-hidden rounded-xl border shadow-[var(--shadow-sm)]">
        <div className="bg-muted/45 text-muted-foreground hidden grid-cols-[1fr_160px_180px_28px] gap-4 border-b px-5 py-2.5 text-[11px] font-semibold tracking-wide sm:grid">
          <span>TEST</span>
          <span>STATUS</span>
          <span>ACTIVITY</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            {filtering && (canLoadMore || loadingMore) ? (
              <>
                <Loader2 className="text-muted-foreground mx-auto size-5 animate-spin" />
                <p className="mt-3 text-sm font-medium">Searching all tests</p>
              </>
            ) : (
              <>
                <Search className="text-muted-foreground mx-auto size-5" />
                <p className="mt-3 text-sm font-medium">No matching tests</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Try a different term or status.
                </p>
              </>
            )}
          </div>
        ) : (
          filtered.map((test) => <TestRow key={test._id} test={test} />)
        )}
      </div>
    </div>
  );
}

function TestRow({ test }: { test: DashboardTest }) {
  const copy = statusCopy[test.status];
  const completed = test.progress?.completedRespondents ?? 0;
  const failed = test.progress?.failedRespondents ?? 0;
  const total = test.progress?.totalRespondents ?? test.respondentCount;
  const percent = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const active = [
    "preparing_personas",
    "running_respondents",
    "synthesizing",
  ].includes(test.status);

  return (
    <Link
      href={`/app/tests/${test._id}`}
      className="group hover:bg-accent/40 grid gap-3 border-b px-4 py-4 transition last:border-b-0 sm:grid-cols-[1fr_160px_180px_28px] sm:items-center sm:gap-4 sm:px-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-accent text-muted-foreground group-hover:bg-background mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg transition group-hover:shadow-[var(--shadow-sm)]">
          {test.optionType === "image" ? (
            <ImageIcon className="size-4" />
          ) : (
            <FileText className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{test.name}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {test.question}
          </p>
        </div>
      </div>
      <div>
        <Badge tone={copy.tone}>{copy.label}</Badge>
      </div>
      <div className="text-muted-foreground text-xs">
        {active ? (
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>
                {completed + failed} of {total}
              </span>
              <span className="text-foreground font-medium">
                {Math.round(percent)}%
              </span>
            </div>
            <Progress value={percent} />
          </div>
        ) : (
          <span>
            {test.status === "draft" ? "Edited" : "Updated"}{" "}
            {formatDistanceToNow(test.updatedAt, { addSuffix: true })}
          </span>
        )}
      </div>
      <ArrowRight className="text-muted-foreground group-hover:text-foreground hidden size-4 transition group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
