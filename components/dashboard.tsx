"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChartBar, ChatText, Faders, Plus, WarningCircle } from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { NewTestDialog } from "@/components/new-test-dialog";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { money, percent, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const me = useQuery(api.users.me, {});
  const pricing = useQuery(api.pricing.getConfig, {});
  const [type, setType] = useState<"all" | "compare" | "question">("all");
  const [status, setStatus] = useState<"all" | "queued" | "running" | "synthesizing" | "completed" | "partial" | "failed">("all");
  const { results: tests, status: historyStatus, loadMore } = usePaginatedQuery(
    api.tests.list,
    me ? { type: type === "all" ? undefined : type, status: status === "all" ? undefined : status } : "skip",
    { initialNumItems: 50 },
  );
  const [newTest, setNewTest] = useState(false);
  const [renderedAt] = useState(() => Date.now());
  const ready = Boolean(me?.onboardingClaimedAt);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Tests</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Launch a focused study and follow every response from one calm workspace.</p>
          </div>
          <Button
            className="h-10 w-full rounded-lg bg-foreground px-4 text-background shadow-sm hover:bg-foreground/90 sm:w-auto"
            onClick={() => setNewTest(true)}
            disabled={!ready}
          >
            <Plus size={16} weight="bold" /> New test
          </Button>
        </section>

        <section className="mt-12" aria-labelledby="test-history-heading">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id="test-history-heading" className="sr-only">Test history</h2>
              <NativeSelect className="w-full sm:w-36" aria-label="Type" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                <NativeSelectOption value="all">All types</NativeSelectOption>
                <NativeSelectOption value="compare">Compare</NativeSelectOption>
                <NativeSelectOption value="question">Question</NativeSelectOption>
              </NativeSelect>
              <NativeSelect className="w-full sm:w-40" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <NativeSelectOption value="all">All statuses</NativeSelectOption>
                <NativeSelectOption value="running">Running</NativeSelectOption>
                <NativeSelectOption value="completed">Completed</NativeSelectOption>
                <NativeSelectOption value="partial">Partial</NativeSelectOption>
                <NativeSelectOption value="failed">Failed</NativeSelectOption>
              </NativeSelect>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {tests.length} {tests.length === 1 ? "test" : "tests"}{historyStatus !== "Exhausted" ? " loaded" : ""}
            </span>
          </div>

          <Card className="overflow-hidden rounded-xl border-border/80 bg-card py-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" aria-label="Past tests">
            {historyStatus === "LoadingFirstPage" ? (
              <LoadingRows />
            ) : tests.length === 0 ? (
              <EmptyState
                onCreate={() => setNewTest(true)}
                ready={ready}
                filtered={type !== "all" || status !== "all"}
                onClear={() => { setType("all"); setStatus("all"); }}
              />
            ) : (
              <>
                {tests.map((test) => <TestRow key={test._id} test={test} renderedAt={renderedAt} />)}
                {historyStatus !== "Exhausted" && (
                  <div className="flex justify-center border-t p-4">
                    <Button variant="outline" disabled={historyStatus === "LoadingMore"} onClick={() => loadMore(50)}>
                      {historyStatus === "LoadingMore" ? "Loading…" : "Load older tests"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </section>
      </main>
      {me && !me.onboardingClaimedAt && <OnboardingDialog />}
      {newTest && pricing && me && <NewTestDialog pricing={pricing} balanceCents={me.balanceCents} onClose={() => setNewTest(false)} />}
    </div>
  );
}

function TestRow({ test, renderedAt }: { test: Doc<"tests">; renderedAt: number }) {
  const done = test.completedCount + test.failedCount;
  const running = ["queued", "running", "synthesizing"].includes(test.status);

  return (
    <Link
      href={`/tests/${test._id}`}
      className="group grid min-h-20 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/55 focus-visible:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[36px_minmax(0,1fr)_auto_20px] sm:gap-4 sm:px-5"
    >
      <div className="grid size-9 place-items-center rounded-lg border bg-background text-muted-foreground shadow-xs">
        {test.testType === "compare" ? <ChartBar size={17} /> : <ChatText size={17} />}
      </div>
      <div className="min-w-0 sm:grid sm:grid-cols-[minmax(180px,1fr)_minmax(160px,300px)] sm:items-center sm:gap-8">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium tracking-[-0.01em]">{test.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {test.testType === "compare" ? "Comparison" : "Open question"} · {test.panelSize} respondents · {money(test.priceCents)}
          </p>
        </div>
        {running && (
          <div className="mt-3 hidden sm:block">
            <div className="mb-1.5 flex justify-between gap-3 text-[11px] text-muted-foreground">
              <span aria-live="polite">{test.status === "synthesizing" ? "Writing synthesis" : done ? `${test.completedCount} of ${test.panelSize} responses` : "Awaiting responses"}</span>
              <span className="font-medium tabular-nums text-foreground">{percent(done, test.panelSize)}%</span>
            </div>
            <Progress className="h-1" value={percent(done, test.panelSize)} aria-label="Panel progress" aria-valuemin={0} aria-valuemax={test.panelSize} aria-valuenow={done} />
            {test.failedCount > 0 && <p className="mt-1 flex items-center gap-1 text-[10px] text-destructive"><WarningCircle size={11} /> {test.failedCount} failed</p>}
          </div>
        )}
      </div>
      <div className="text-right">
        <Status status={test.status} />
        <time className="mt-1.5 block whitespace-nowrap text-[11px] text-muted-foreground">{timeAgo(test.launchedAt, renderedAt)}</time>
      </div>
      <ArrowRight className="hidden text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" size={15} />
    </Link>
  );
}

function Status({ status }: { status: string }) {
  const label = ({ queued: "Queued", running: "Running", synthesizing: "Synthesizing", completed: "Completed", partial: "Partial", failed: "Failed" } as Record<string, string>)[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 rounded-md px-1.5 text-[10px] font-medium capitalize shadow-none",
        status === "completed" && "border-emerald-600/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400",
        ["queued", "running", "synthesizing", "partial"].includes(status) && "border-amber-600/20 bg-amber-500/8 text-amber-700 dark:text-amber-400",
        status === "failed" && "border-destructive/20 bg-destructive/8 text-destructive",
      )}
    >
      {label}
    </Badge>
  );
}

function LoadingRows() {
  return <>{[0, 1, 2].map((item) => <div className="grid min-h-20 grid-cols-[36px_1fr_auto] items-center gap-4 border-b px-5 last:border-b-0" key={item}><Skeleton className="size-9 rounded-lg" /><div className="space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="h-5 w-20" /></div>)}</>;
}

function EmptyState({ onCreate, ready, filtered, onClear }: { onCreate(): void; ready: boolean; filtered: boolean; onClear(): void }) {
  const title = filtered ? "No tests match these filters" : ready ? "No tests yet" : "Claim your welcome credit";
  const description = filtered
    ? "Try clearing the filters to see the rest of your test history."
    : ready
      ? "Ask one focused question and get a structured read from a purpose-built AI panel."
      : "Answer two short onboarding questions, then launch your first panel.";

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-11 place-items-center rounded-xl border bg-muted/45 text-muted-foreground shadow-xs"><Faders size={20} /></div>
      <h2 className="mt-5 text-base font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {filtered ? (
        <Button className="mt-5" variant="outline" onClick={onClear}>Clear filters</Button>
      ) : ready ? (
        <Button className="mt-5 bg-foreground text-background hover:bg-foreground/90" onClick={onCreate}><Plus size={15} /> New test</Button>
      ) : null}
    </div>
  );
}
