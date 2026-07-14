"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChartBar, ChatText, Faders, Plus, WarningCircle } from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { NewTestDialog } from "@/components/new-test-dialog";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { money, percent, timeAgo } from "@/lib/format";

export function Dashboard() {
  const me = useQuery(api.users.me, {});
  const pricing = useQuery(api.pricing.getConfig, {});
  const [type, setType] = useState<"all" | "compare" | "question">("all");
  const [status, setStatus] = useState<"all" | "queued" | "running" | "synthesizing" | "completed" | "partial" | "failed">("all");
  const tests = useQuery(api.tests.list, me ? { type: type === "all" ? undefined : type, status: status === "all" ? undefined : status } : "skip");
  const [newTest, setNewTest] = useState(false);
  const [renderedAt] = useState(() => Date.now());

  return <div className="app-shell"><AppHeader /><main className="dashboard-main"><div className="page-heading"><div><p className="eyebrow">Workspace</p><h1>Tests</h1><p className="muted">Launch a panel, then watch responses arrive here.</p></div><button className="button primary" onClick={() => setNewTest(true)} disabled={!me?.onboardingClaimedAt}><Plus size={16} /> New test</button></div>
    <div className="list-toolbar"><div className="filters"><label><span>Type</span><select value={type} onChange={(event) => setType(event.target.value as any)}><option value="all">All types</option><option value="compare">Compare</option><option value="question">Question</option></select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All statuses</option><option value="running">Running</option><option value="completed">Completed</option><option value="partial">Partial</option><option value="failed">Failed</option></select></label></div><span className="result-count">{tests?.length ?? 0} {tests?.length === 1 ? "test" : "tests"}</span></div>
    <section className="test-list" aria-label="Past tests">{tests === undefined ? <LoadingRows /> : tests.length === 0 ? <EmptyState onCreate={() => setNewTest(true)} ready={Boolean(me?.onboardingClaimedAt)} filtered={type !== "all" || status !== "all"} onClear={() => { setType("all"); setStatus("all"); }} /> : tests.map((test) => <TestRow key={test._id} test={test} renderedAt={renderedAt} />)}</section>
  </main>
  {me && !me.onboardingClaimedAt && <OnboardingDialog />}
  {newTest && pricing && me && <NewTestDialog pricing={pricing} balanceCents={me.balanceCents} onClose={() => setNewTest(false)} />}
  </div>;
}

function TestRow({ test, renderedAt }: { test: Doc<"tests">; renderedAt: number }) {
  const done = test.completedCount + test.failedCount;
  const running = ["queued", "running", "synthesizing"].includes(test.status);
  return <Link href={`/tests/${test._id}`} className="test-row"><div className={`type-icon ${test.testType}`}>{test.testType === "compare" ? <ChartBar size={17} /> : <ChatText size={17} />}</div><div className="test-main"><div><h3>{test.title}</h3><span>{test.testType === "compare" ? "Comparison" : "Open question"} · {test.panelSize} respondents · {money(test.priceCents)}</span></div>{running && <div className="row-progress"><div><span aria-live="polite">{test.status === "synthesizing" ? "Writing synthesis" : done ? `${test.completedCount} of ${test.panelSize} responses` : "Awaiting responses"}</span><b>{percent(done, test.panelSize)}%</b></div><i role="progressbar" aria-label="Panel progress" aria-valuemin={0} aria-valuemax={test.panelSize} aria-valuenow={done}><span style={{ width: `${percent(done, test.panelSize)}%` }} /></i>{test.failedCount > 0 && <small><WarningCircle size={12} /> {test.failedCount} failed</small>}</div>}</div><div className="test-meta"><Status status={test.status} /><time>{timeAgo(test.launchedAt, renderedAt)}</time></div><ArrowRight className="row-arrow" size={16} /></Link>;
}

function Status({ status }: { status: string }) {
  const label = ({ queued: "Queued", running: "Running", synthesizing: "Synthesizing", completed: "Completed", partial: "Partial", failed: "Failed" } as Record<string, string>)[status] ?? status;
  return <span className={`status ${status}`}><i />{label}</span>;
}
function LoadingRows() { return <>{[0,1,2].map((item) => <div className="test-row skeleton" key={item}><div /><div /><div /></div>)}</>; }
function EmptyState({ onCreate, ready, filtered, onClear }: { onCreate(): void; ready: boolean; filtered: boolean; onClear(): void }) {
  if (filtered) return <div className="empty-state"><div className="empty-icon"><Faders size={21} /></div><h2>No tests match these filters</h2><p>Clear the filters to see the rest of your test history.</p><button className="button secondary" onClick={onClear}>Clear filters</button></div>;
  return <div className="empty-state"><div className="empty-icon"><Faders size={21} /></div><h2>{ready ? "No tests yet" : "Claim your welcome credit"}</h2><p>{ready ? "Start with one focused question. Your first 20-person panel costs $5." : "Answer two short onboarding questions, then launch your first panel."}</p>{ready && <button className="button secondary" onClick={onCreate}><Plus size={15} /> New test</button>}</div>;
}
