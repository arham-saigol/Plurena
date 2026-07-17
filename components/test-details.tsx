"use client";

import { usePaginatedQuery, useQuery, type PaginationStatus } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import type { aggregateComparison, aggregateOpenEnded } from "@/convex/lib/aggregation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ClipboardText, Copy, DownloadSimple, Export, Repeat, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { NewTestDialog, type RerunSeed } from "@/components/new-test-dialog";
import { money, percent, timeAgo } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type TestData = FunctionReturnType<typeof api.tests.get>;
type TestOption = TestData["options"][number];
type ResponseResult = FunctionReturnType<typeof api.tests.getResponses>["page"][number];
type ResponseWithPersona = ResponseResult & { persona: NonNullable<ResponseResult["persona"]> };
type ResponsesData = TestData & { responses: ResponseResult[] };
type ComparisonAggregateData = ReturnType<typeof aggregateComparison>;
type QuestionAggregateData = ReturnType<typeof aggregateOpenEnded>;

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
  const [renderedAt] = useState(() => Date.now());
  const needsResponses = tab === "responses" || exportAction !== null;
  const responseQuery = usePaginatedQuery(
    api.tests.getResponses,
    me && needsResponses ? { testId: id } : "skip",
    { initialNumItems: 50 },
  );
  const responseResults = responseQuery.results;
  const responseStatus = responseQuery.status;
  const loadMoreResponses = responseQuery.loadMore;

  useEffect(() => {
    if (!exportAction || !data) return;
    if (responseStatus === "CanLoadMore") {
      loadMoreResponses(50);
      return;
    }
    if (responseStatus !== "Exhausted") return;
    let cancelled = false;
    void (async () => {
      try {
        const markdown = createMarkdown({ ...data, responses: responseResults });
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
  }, [data, exportAction, loadMoreResponses, responseResults, responseStatus]);

  if (!data) return <div className="app-shell"><AppHeader /><main className="details-main"><Skeleton className="detail-skeleton" /></main></div>;

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
    options: options.map((option) => ({ key: String(option._id), label: option.label, optionType: option.optionType, text: option.text ?? "", assetId: option.assetId, fileName: option.optionType === "image" ? option.label : undefined })),
  };
  const beginExport = (action: "copy" | "pdf") => {
    setExportError("");
    setExportMessage("");
    setExportAction(action);
  };

  return <div className="app-shell"><AppHeader /><main className="details-main">
    <div className="details-top"><Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/dashboard" />}><ArrowLeft size={15} /> All tests</Button><div className="detail-actions">
      <Button variant="ghost" aria-label="Copy as Markdown" disabled={exportAction !== null} aria-busy={exportAction === "copy"} onClick={() => beginExport("copy")}>{exportMessage.startsWith("Copied") ? <Check size={15} /> : <Copy size={15} />}<span className="result-action-label">{exportAction === "copy" ? "Preparing…" : "Copy as Markdown"}</span></Button>
      <Button variant="ghost" aria-label="Download PDF" disabled={exportAction !== null} aria-busy={exportAction === "pdf"} onClick={() => beginExport("pdf")}><DownloadSimple size={15} /><span className="result-action-label">{exportAction === "pdf" ? "Preparing…" : "PDF"}</span></Button>
      <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" aria-label="Rerun test" />}><Repeat size={15} /><span className="result-action-label">Rerun</span></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setRerun("fresh")}><span><strong className="block">Fresh panel</strong><small>Generate new personas</small></span></DropdownMenuItem><DropdownMenuItem disabled={test.panelVersion === "audience-simulation-v1" && !test.panelReadyAt} onClick={() => setRerun("same")}><span><strong className="block">Same panel</strong><small>{test.panelVersion === "audience-simulation-v1" && !test.panelReadyAt ? "Available after panel generation" : "Reuse these personas"}</small></span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div></div>
    {(exportMessage || exportError) && <p className={exportError ? "form-error export-notice" : "export-notice"} role={exportError ? "alert" : "status"}>{exportError || exportMessage}</p>}
    <section className="result-header"><div><div className="result-kicker"><Badge variant={test.status === "failed" ? "destructive" : test.status === "completed" ? "default" : "secondary"} className={`status ${test.status}`}><i />{test.status}</Badge><span>{timeAgo(test.launchedAt, renderedAt)}</span></div><h1>{test.title}</h1><p>{test.testType === "compare" ? "Comparison" : "Open question"} · {test.panelSize} respondents · {money(test.priceCents)}</p></div><div className="header-stat"><span>Responses</span><strong>{test.completedCount}<small>/{test.panelSize}</small></strong></div></section>
    {running && <Card className="live-progress"><div aria-live="polite"><span className="live-dot" /><strong>{test.status === "synthesizing" ? "Responses complete. Plurena is writing the synthesis." : !test.panelReadyAt && test.panelVersion === "audience-simulation-v1" ? "Plurena is designing a decision-relevant audience panel." : test.completedCount ? "Responses are arriving." : "The panel is preparing responses."}</strong><span>{test.completedCount} completed · {test.failedCount} failed</span></div><b>{progress}%</b><Progress value={progress} aria-label="Panel progress" aria-valuemin={0} aria-valuemax={test.panelSize} aria-valuenow={test.completedCount + test.failedCount} /></Card>}
    {test.status === "partial" && <Alert><WarningCircle size={18} /><AlertTitle>Partial result</AlertTitle><AlertDescription>{test.failedCount} respondents exhausted every model fallback. The aggregate uses {test.completedCount} completed responses.</AlertDescription></Alert>}
    {test.status === "failed" && <Alert role="status" variant="destructive"><WarningCircle size={18} /><AlertTitle>{test.panelVersion === "audience-simulation-v1" && !test.panelReadyAt ? "Panel generation failed" : "No usable responses"}</AlertTitle><AlertDescription>{test.panelVersion === "audience-simulation-v1" && !test.panelReadyAt ? "Plurena could not generate a valid audience panel, so the test was refunded. Your setup remains available for a rerun." : "Each assigned model and fallback failed. Your setup remains available for a rerun."}</AlertDescription></Alert>}
    <nav className="result-tabs" aria-label="Result view"><Button variant="ghost" aria-pressed={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</Button><Button variant="ghost" aria-pressed={tab === "responses"} className={tab === "responses" ? "active" : ""} onClick={() => setTab("responses")}>Responses <span>{test.completedCount}</span></Button></nav>
    {tab === "overview" ? <Overview data={data} /> : <Responses data={{ ...data, responses: responseResults }} queryStatus={responseStatus} loadMore={() => loadMoreResponses(50)} />}
  </main>{rerun && pricing && me && <NewTestDialog pricing={pricing} balanceCents={me.balanceCents} seed={seed} onClose={() => setRerun(null)} />}</div>;
}

function Overview({ data }: { data: TestData }) {
  const { test, options, aggregate, synthesis } = data;
  if (!aggregate) return <div className="overview-grid"><Card className="overview-card waiting-card"><UsersThree size={23} /><h2>Overview will appear here</h2><p>Plurena builds the aggregate after every assignment finishes or exhausts its fallbacks.</p></Card><SetupCard data={data} /></div>;
  return <div className="overview-grid"><Card className="overview-card aggregate-card"><div className="card-heading"><div><p className="eyebrow">Aggregate</p><h2>{test.testType === "compare" ? "Panel ranking" : "Answer patterns"}</h2></div><Badge variant="secondary">{aggregate.responseCount} responses</Badge></div>{test.testType === "compare" ? <ComparisonAggregate aggregate={aggregate.data as ComparisonAggregateData} options={options} /> : <QuestionAggregate aggregate={aggregate.data as QuestionAggregateData} />}</Card>
    {synthesis && <Card className="overview-card synthesis-card"><div className="card-heading"><div><p className="eyebrow">Research synthesis</p><h2>What respondents said</h2></div><Export size={18} /></div><p className="synthesis-summary">{synthesis.summary}</p><InsightGroup title="Patterns" items={synthesis.patterns} /><InsightGroup title="Meaningful disagreement" items={synthesis.disagreements} /><InsightGroup title="Next actions" items={synthesis.nextActions} numbered /></Card>}
    <SetupCard data={data} />
  </div>;
}

function ComparisonAggregate({ aggregate, options }: { aggregate: ComparisonAggregateData; options: TestOption[] }) {
  const optionMap = new Map(options.map((option) => [String(option._id), option]));
  return <div className="ranking">{aggregate.ranked.map((row, index) => { const option = optionMap.get(row.optionId); const winner = aggregate.winnerOptionId === row.optionId; const tied = aggregate.tiedLeaderOptionIds?.includes(row.optionId); return <div className={winner ? "rank-row winner" : "rank-row"} key={row.optionId}><div className="rank-number">{index + 1}</div><div className="rank-content"><div><strong>{option?.label ?? "Option"}{winner && <small>Winner</small>}{tied && <small>Tied</small>}</strong><span>{row.votes} votes</span></div>{option?.text && <p className="rank-preview">{option.text}</p>}{option?.imageUrl && <Image className="rank-image" src={option.imageUrl} alt={option.label} width={62} height={42} />}<i><span style={{ width: `${row.share}%` }} /></i></div><b>{row.share}%</b></div>; })}<div className="none-row"><span>None of the above{aggregate.noneOfAboveLed ? " · leading or tied" : ""}</span><strong>{aggregate.noneOfAbove} responses</strong></div></div>;
}
function QuestionAggregate({ aggregate }: { aggregate: QuestionAggregateData }) { return <div><div className="term-grid">{aggregate.commonTerms.map((item) => <div key={item.term}><strong>{item.term}</strong><span>{item.count} mentions</span></div>)}</div><h3 className="subheading">Sample answers</h3><div className="sample-answers">{aggregate.sampleAnswers.slice(0, 4).map((answer, index) => <blockquote key={index}>{answer}</blockquote>)}</div></div>; }
function InsightGroup({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) { if (!items.length) return null; return <div className="insight-group"><h3>{title}</h3>{numbered ? <ol>{items.map((item, index) => <li key={index}>{item}</li>)}</ol> : <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>}</div>; }
function SetupCard({ data }: { data: TestData }) { const { test, options } = data; const blueprint = test.panelBlueprint; return <Card className="overview-card setup-overview"><p className="eyebrow">Study setup</p><dl><div><dt>Audience</dt><dd>{blueprint?.audienceInterpretation ?? test.audience.description}</dd></div><div><dt>Location</dt><dd>{test.audience.locations.join(", ")}</dd></div><div><dt>Age and gender</dt><dd>{test.audience.minAge}–{test.audience.maxAge} · {test.audience.gender}</dd></div><div><dt>Content</dt><dd>{options.length ? `${options.length} ${options.length === 1 ? "item" : "options"}` : "Question only"}</dd></div><div><dt>Panel</dt><dd>{test.panelSize} personas {test.reusedPanel ? "· reused" : "· generated fresh"}</dd></div>{blueprint && <><div><dt>Behavioral segments</dt><dd>{blueprint.segments.map((segment) => `${segment.name} ${segment.targetShare}%`).join(" · ")}</dd></div><div><dt>Panel assumptions</dt><dd>{blueprint.assumptions.join(" · ")}</dd></div></>}</dl>{blueprint && <p className="mt-4 text-xs leading-5 text-muted-foreground">This is an AI-generated hypothesis panel. Segment shares provide purposeful coverage and are not population prevalence estimates.</p>}</Card>; }

function Responses({ data, queryStatus, loadMore }: { data: ResponsesData; queryStatus: PaginationStatus; loadMore(): void }) {
  const optionMap = new Map(data.options.map((option) => [String(option._id), option]));
  const responses = data.responses.filter(hasPersona);
  if (!responses.length && ["LoadingFirstPage", "LoadingMore"].includes(queryStatus)) return <div className="empty-responses"><ClipboardText size={22} /><h2>Loading responses</h2><p>Retrieving completed answers…</p></div>;
  if (!responses.length) {
    const failed = data.test.status === "failed";
    return <div className="empty-responses"><ClipboardText size={22} /><h2>{failed ? "No responses were completed" : "Awaiting responses"}</h2><p>{failed ? "Every assignment exhausted its available model routes." : "Individual answers will appear as the panel completes assignments."}</p></div>;
  }
  const sorted = [...responses].sort((a, b) => a.persona.ordinal - b.persona.ordinal);
  return <div className="response-list">{sorted.map((response) => <Card className="response-card" key={response._id}><div className="persona-line"><div className="persona-avatar">{response.persona.ordinal + 1}</div><div><strong>{response.persona.age}, {response.persona.location}</strong><span>{response.persona.gender} · {response.persona.segmentName ? `${response.persona.segmentName} · ` : ""}{response.persona.pointOfView}</span></div></div><div className="response-answer"><span>{data.test.testType === "compare" ? "Choice" : "Answer"}{typeof response.confidence === "number" ? ` · ${response.confidence}% confidence` : ""}</span><p>{data.test.testType === "compare" ? (optionMap.get(String(response.choiceOptionId))?.label ?? "None of the above") : response.answer}</p></div><ul className="feedback-list">{response.feedback.map((item, index) => <li key={index}>{item}</li>)}</ul><div className="persona-tags">{response.persona.interests.map((item) => <Badge variant="secondary" key={item}>{item}</Badge>)}{response.persona.constraints.map((item) => <Badge variant="outline" key={item}>{item}</Badge>)}{(response.missingEvidence ?? []).map((item) => <Badge variant="outline" key={`missing-${item}`}>Needs: {item}</Badge>)}</div></Card>)}{queryStatus === "CanLoadMore" && <Button variant="outline" onClick={loadMore}>Load more responses</Button>}</div>;
}

function createMarkdown(data: ResponsesData) {
  const { test, options, responses, aggregate, synthesis } = data;
  const optionMap = new Map(options.map((option) => [String(option._id), option.label]));
  const lines = [`# ${test.title}`, "", `- Type: ${test.testType === "compare" ? "Comparison" : "Open question"}`, `- Panel: ${test.panelSize} respondents`, `- Status: ${test.status}`, `- Cost: ${money(test.priceCents)}`, "", "## Audience", "", `${test.audience.description} (${test.audience.locations.join(", ")}; ages ${test.audience.minAge}–${test.audience.maxAge}; ${test.audience.gender})`, ""];
  if (test.panelBlueprint) lines.push("## Synthetic panel design", "", test.panelBlueprint.audienceInterpretation, "", ...test.panelBlueprint.segments.map((segment) => `- **${segment.name} (${segment.targetShare}% coverage):** ${segment.summary}`), "", "These are purposeful AI panel coverage weights, not population prevalence estimates.", "");
  if (options.length) lines.push("## Options", "", ...options.map((option) => `- **${option.label}:** ${option.text ?? "[Image]"}`), "");
  if (aggregate) lines.push("## Aggregate results", "", "```json", JSON.stringify(aggregate.data, null, 2), "```", "");
  if (synthesis) lines.push("## Synthesis", "", synthesis.summary, "", "### Patterns", ...synthesis.patterns.map((item: string) => `- ${item}`), "", "### Meaningful disagreement", ...synthesis.disagreements.map((item: string) => `- ${item}`), "", "### Next actions", ...synthesis.nextActions.map((item: string, index: number) => `${index + 1}. ${item}`), "");
  lines.push("## Respondent answers", "");
  for (const response of responses.filter(hasPersona)) lines.push(`### Respondent ${response.persona.ordinal + 1}: ${response.persona.age}, ${response.persona.location}`, "", response.persona.segmentName ? `Segment: ${response.persona.segmentName}` : "", typeof response.confidence === "number" ? `Confidence: ${response.confidence}%` : "", test.testType === "compare" ? `Choice: ${optionMap.get(String(response.choiceOptionId)) ?? "None of the above"}` : (response.answer ?? ""), "", ...response.feedback.map((item) => `- ${item}`), ...(response.missingEvidence ?? []).map((item) => `- Missing evidence: ${item}`), "");
  return lines.join("\n");
}

function hasPersona(response: ResponseResult): response is ResponseWithPersona {
  return response.persona !== null;
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
