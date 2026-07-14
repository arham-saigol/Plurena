"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ClipboardText, Copy, DownloadSimple, Export, Repeat, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { NewTestDialog, type RerunSeed } from "@/components/new-test-dialog";
import { money, percent, timeAgo } from "@/lib/format";

export function TestDetails({ testId }: { testId: string }) {
  const id = testId as Id<"tests">;
  const me = useQuery(api.users.me, {});
  const data = useQuery(api.tests.get, me ? { testId: id } : "skip");
  const pricing = useQuery(api.pricing.getConfig, {});
  const [tab, setTab] = useState<"overview" | "responses">("overview");
  const [rerun, setRerun] = useState<"fresh" | "same" | null>(null);
  const [exportAction, setExportAction] = useState<"copy" | "pdf" | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const needsResponses = tab === "responses" || exportAction !== null;
  const responseQuery = usePaginatedQuery(
    api.tests.getResponses,
    me && needsResponses ? { testId: id } : "skip",
    { initialNumItems: 50 },
  );

  useEffect(() => {
    if (!exportAction || !data) return;
    if (responseQuery.status === "CanLoadMore") {
      responseQuery.loadMore(50);
      return;
    }
    if (responseQuery.status !== "Exhausted") return;
    let cancelled = false;
    void (async () => {
      try {
        const markdown = createMarkdown({ ...data, responses: responseQuery.results });
        if (exportAction === "copy") {
          await navigator.clipboard.writeText(markdown);
          if (!cancelled) setExportMessage("Copied results as Markdown.");
        } else {
          await downloadPdf(markdown, data.test.title);
          if (!cancelled) setExportMessage("PDF downloaded.");
        }
      } catch (cause) {
        if (!cancelled) setExportError(cause instanceof Error ? cause.message : "Export failed. Try again.");
      } finally {
        if (!cancelled) setExportAction(null);
      }
    })();
    return () => { cancelled = true; };
  }, [data, exportAction, responseQuery]);

  if (!data) return <div className="app-shell"><AppHeader /><main className="details-main"><div className="skeleton detail-skeleton" /></main></div>;

  const { test, options } = data;
  const running = ["queued", "running", "synthesizing"].includes(test.status);
  const progress = percent(test.completedCount + test.failedCount, test.panelSize);
  const seed: RerunSeed = {
    testId: test._id,
    title: test.title,
    testType: test.testType,
    panelSize: test.panelSize,
    audience: test.audience,
    reusePanel: rerun === "same",
    options: options.map((option: any) => ({ key: String(option._id), label: option.label, optionType: option.optionType, text: option.text ?? "", assetId: option.assetId, fileName: option.optionType === "image" ? option.label : undefined })),
  };
  const beginExport = (action: "copy" | "pdf") => {
    setExportError("");
    setExportMessage("");
    setExportAction(action);
  };

  return <div className="app-shell"><AppHeader /><main className="details-main">
    <div className="details-top"><Link href="/dashboard" className="back-link"><ArrowLeft size={15} /> All tests</Link><div className="detail-actions">
      <button className="button ghost" disabled={exportAction !== null} aria-busy={exportAction === "copy"} onClick={() => beginExport("copy")}>{exportMessage.startsWith("Copied") ? <Check size={15} /> : <Copy size={15} />}{exportAction === "copy" ? "Preparing…" : "Copy as Markdown"}</button>
      <button className="button ghost" disabled={exportAction !== null} aria-busy={exportAction === "pdf"} onClick={() => beginExport("pdf")}><DownloadSimple size={15} /> {exportAction === "pdf" ? "Preparing…" : "PDF"}</button>
      <div className="rerun-menu"><button className="button secondary"><Repeat size={15} /> Rerun</button><div><button onClick={() => setRerun("fresh")}>Fresh panel<span>Generate new personas</span></button><button onClick={() => setRerun("same")}>Same panel<span>Reuse these personas</span></button></div></div>
    </div></div>
    {(exportMessage || exportError) && <p className={exportError ? "form-error export-notice" : "export-notice"} role={exportError ? "alert" : "status"}>{exportError || exportMessage}</p>}
    <section className="result-header"><div><div className="result-kicker"><span className={`status ${test.status}`}><i />{test.status}</span><span>{timeAgo(test.launchedAt)}</span></div><h1>{test.title}</h1><p>{test.testType === "compare" ? "Comparison" : "Open question"} · {test.panelSize} respondents · {money(test.priceCents)}</p></div><div className="header-stat"><span>Responses</span><strong>{test.completedCount}<small>/{test.panelSize}</small></strong></div></section>
    {running && <section className="live-progress"><div aria-live="polite"><span className="live-dot" /><strong>{test.status === "synthesizing" ? "Responses complete. Plurena is writing the synthesis." : test.completedCount ? "Responses are arriving." : "The panel is preparing responses."}</strong><span>{test.completedCount} completed · {test.failedCount} failed</span></div><b>{progress}%</b><i role="progressbar" aria-label="Panel progress" aria-valuemin={0} aria-valuemax={test.panelSize} aria-valuenow={test.completedCount + test.failedCount}><span style={{ width: `${progress}%` }} /></i></section>}
    {test.status === "partial" && <div className="state-banner warning"><WarningCircle size={18} /><div><strong>Partial result</strong><span>{test.failedCount} respondents exhausted every model fallback. The aggregate uses {test.completedCount} completed responses.</span></div></div>}
    {test.status === "failed" && <div className="state-banner error"><WarningCircle size={18} /><div><strong>No usable responses</strong><span>Each assigned model and fallback failed. Your setup remains available for a rerun.</span></div></div>}
    <nav className="result-tabs" aria-label="Result view"><button aria-pressed={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button><button aria-pressed={tab === "responses"} className={tab === "responses" ? "active" : ""} onClick={() => setTab("responses")}>Responses <span>{test.completedCount}</span></button></nav>
    {tab === "overview" ? <Overview data={data} /> : <Responses data={{ ...data, responses: responseQuery.results }} queryStatus={responseQuery.status} loadMore={() => responseQuery.loadMore(50)} />}
  </main>{rerun && pricing && me && <NewTestDialog pricing={pricing} balanceCents={me.balanceCents} seed={seed} onClose={() => setRerun(null)} />}</div>;
}

function Overview({ data }: { data: any }) {
  const { test, options, aggregate, synthesis } = data;
  if (!aggregate) return <div className="overview-grid"><section className="overview-card waiting-card"><UsersThree size={23} /><h2>Overview will appear here</h2><p>Plurena builds the aggregate after every assignment finishes or exhausts its fallbacks.</p></section><SetupCard data={data} /></div>;
  return <div className="overview-grid"><section className="overview-card aggregate-card"><div className="card-heading"><div><p className="eyebrow">Aggregate</p><h2>{test.testType === "compare" ? "Panel ranking" : "Answer patterns"}</h2></div><span>{aggregate.responseCount} responses</span></div>{test.testType === "compare" ? <ComparisonAggregate aggregate={aggregate.data} options={options} /> : <QuestionAggregate aggregate={aggregate.data} />}</section>
    {synthesis && <section className="overview-card synthesis-card"><div className="card-heading"><div><p className="eyebrow">Research synthesis</p><h2>What respondents said</h2></div><Export size={18} /></div><p className="synthesis-summary">{synthesis.summary}</p><InsightGroup title="Patterns" items={synthesis.patterns} /><InsightGroup title="Meaningful disagreement" items={synthesis.disagreements} /><InsightGroup title="Next actions" items={synthesis.nextActions} numbered /></section>}
    <SetupCard data={data} />
  </div>;
}

function ComparisonAggregate({ aggregate, options }: { aggregate: any; options: any[] }) {
  const optionMap = new Map(options.map((option) => [String(option._id), option]));
  return <div className="ranking">{aggregate.ranked.map((row: any, index: number) => { const option = optionMap.get(row.optionId); const winner = aggregate.winnerOptionId === row.optionId; const tied = aggregate.tiedLeaderOptionIds?.includes(row.optionId); return <div className={winner ? "rank-row winner" : "rank-row"} key={row.optionId}><div className="rank-number">{index + 1}</div><div className="rank-content"><div><strong>{option?.label ?? "Option"}{winner && <small>Winner</small>}{tied && <small>Tied</small>}</strong><span>{row.votes} votes</span></div>{option?.text && <p className="rank-preview">{option.text}</p>}{option?.imageUrl && <img className="rank-image" src={option.imageUrl} alt={option.label} />}<i><span style={{ width: `${row.share}%` }} /></i></div><b>{row.share}%</b></div>; })}<div className="none-row"><span>None of the above{aggregate.noneOfAboveLed ? " · leading or tied" : ""}</span><strong>{aggregate.noneOfAbove} responses</strong></div></div>;
}
function QuestionAggregate({ aggregate }: { aggregate: any }) { return <div><div className="term-grid">{aggregate.commonTerms.map((item: any) => <div key={item.term}><strong>{item.term}</strong><span>{item.count} mentions</span></div>)}</div><h3 className="subheading">Sample answers</h3><div className="sample-answers">{aggregate.sampleAnswers.slice(0, 4).map((answer: string, index: number) => <blockquote key={index}>{answer}</blockquote>)}</div></div>; }
function InsightGroup({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) { if (!items.length) return null; return <div className="insight-group"><h3>{title}</h3>{numbered ? <ol>{items.map((item, index) => <li key={index}>{item}</li>)}</ol> : <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>}</div>; }
function SetupCard({ data }: { data: any }) { const { test, options } = data; return <section className="overview-card setup-overview"><p className="eyebrow">Study setup</p><dl><div><dt>Audience</dt><dd>{test.audience.description}</dd></div><div><dt>Location</dt><dd>{test.audience.locations.join(", ")}</dd></div><div><dt>Age and gender</dt><dd>{test.audience.minAge}–{test.audience.maxAge} · {test.audience.gender}</dd></div><div><dt>Content</dt><dd>{options.length ? `${options.length} ${options.length === 1 ? "item" : "options"}` : "Question only"}</dd></div><div><dt>Panel</dt><dd>{test.panelSize} personas {test.reusedPanel ? "· reused" : "· generated fresh"}</dd></div></dl></section>; }

function Responses({ data, queryStatus, loadMore }: { data: any; queryStatus: string; loadMore(): void }) {
  const optionMap = new Map<string, any>(data.options.map((option: any) => [String(option._id), option]));
  if (!data.responses.length && ["LoadingFirstPage", "LoadingMore"].includes(queryStatus)) return <div className="empty-responses"><ClipboardText size={22} /><h2>Loading responses</h2><p>Retrieving completed answers…</p></div>;
  if (!data.responses.length) {
    const failed = data.test.status === "failed";
    return <div className="empty-responses"><ClipboardText size={22} /><h2>{failed ? "No responses were completed" : "Awaiting responses"}</h2><p>{failed ? "Every assignment exhausted its available model routes." : "Individual answers will appear as the panel completes assignments."}</p></div>;
  }
  const sorted = [...data.responses].sort((a: any, b: any) => a.persona.ordinal - b.persona.ordinal);
  return <div className="response-list">{sorted.map((response: any) => <article className="response-card" key={response._id}><div className="persona-line"><div className="persona-avatar">{response.persona.ordinal + 1}</div><div><strong>{response.persona.age}, {response.persona.location}</strong><span>{response.persona.gender} · {response.persona.pointOfView}</span></div><small>{response.provider.replace("_", " ")} · {response.model}</small></div><div className="response-answer"><span>{data.test.testType === "compare" ? "Choice" : "Answer"}</span><p>{data.test.testType === "compare" ? (optionMap.get(String(response.choiceOptionId))?.label ?? "None of the above") : response.answer}</p></div><ul className="feedback-list">{response.feedback.map((item: string, index: number) => <li key={index}>{item}</li>)}</ul><div className="persona-tags">{response.persona.interests.map((item: string) => <span key={item}>{item}</span>)}{response.persona.constraints.map((item: string) => <span key={item}>{item}</span>)}</div></article>)}{queryStatus === "CanLoadMore" && <button className="button secondary" onClick={loadMore}>Load more responses</button>}</div>;
}

function createMarkdown(data: any) {
  const { test, options, responses, aggregate, synthesis } = data;
  const optionMap = new Map(options.map((option: any) => [String(option._id), option.label]));
  const lines = [`# ${test.title}`, "", `- Type: ${test.testType === "compare" ? "Comparison" : "Open question"}`, `- Panel: ${test.panelSize} respondents`, `- Status: ${test.status}`, `- Cost: ${money(test.priceCents)}`, "", "## Audience", "", `${test.audience.description} (${test.audience.locations.join(", ")}; ages ${test.audience.minAge}–${test.audience.maxAge}; ${test.audience.gender})`, ""];
  if (options.length) lines.push("## Options", "", ...options.map((option: any) => `- **${option.label}:** ${option.text ?? "[Image]"}`), "");
  if (aggregate) lines.push("## Aggregate results", "", "```json", JSON.stringify(aggregate.data, null, 2), "```", "");
  if (synthesis) lines.push("## Synthesis", "", synthesis.summary, "", "### Patterns", ...synthesis.patterns.map((item: string) => `- ${item}`), "", "### Meaningful disagreement", ...synthesis.disagreements.map((item: string) => `- ${item}`), "", "### Next actions", ...synthesis.nextActions.map((item: string, index: number) => `${index + 1}. ${item}`), "");
  lines.push("## Respondent answers", "");
  for (const response of responses) lines.push(`### Respondent ${response.persona.ordinal + 1}: ${response.persona.age}, ${response.persona.location}`, "", data.test.testType === "compare" ? `Choice: ${optionMap.get(String(response.choiceOptionId)) ?? "None of the above"}` : response.answer, "", ...response.feedback.map((item: string) => `- ${item}`), "");
  return lines.join("\n");
}

async function downloadPdf(markdown: string, title: string) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const fontResponse = await fetch("/fonts/NotoSans.ttf");
  if (!fontResponse.ok) throw new Error("PDF font could not be loaded.");
  document.addFileToVFS("NotoSans.ttf", arrayBufferToBase64(await fontResponse.arrayBuffer()));
  document.addFont("NotoSans.ttf", "NotoSans", "normal");
  document.setFont("NotoSans", "normal");
  document.setFontSize(10);
  const lines = document.splitTextToSize(markdown, 500);
  let y = 48;
  for (const line of lines) { if (y > 790) { document.addPage(); y = 48; } document.text(line, 48, y); y += 14; }
  document.save(`${slug(title)}-plurena.pdf`);
}
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "test-results"; }
function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  return btoa(binary);
}
