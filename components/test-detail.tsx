"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FilePenLine,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/form-controls";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMoney, formatPercent } from "@/lib/utils";

type TestDetails = {
  test: Doc<"tests">;
  progress: Doc<"testProgress"> | null;
  options: Array<
    (Doc<"testOptions"> | Doc<"snapshotOptions">) & { imageUrl?: string | null }
  >;
  report: Doc<"synthesisReports"> | null;
};

type ResponseView = {
  id: Id<"responses">;
  runId: Id<"respondentRuns">;
  persona: {
    id: Id<"personas">;
    displayName: string;
    background: string;
    goals: Array<string>;
    motivations: Array<string>;
    frustrations: Array<string>;
    decisionDrivers: Array<string>;
    familiarity: string;
    behavioralTraits: Array<string>;
    reasoningStyle: string;
    priceSensitivity: string;
    soul: string;
  };
  selection: { id: Id<"snapshotOptions">; label: string };
  reasons: Array<string>;
  comparisons: Array<string>;
  objection?: string;
  confidence: "low" | "medium" | "high";
  confidenceScore: number;
  completedAt: number;
};

const activeStatuses = new Set<Doc<"tests">["status"]>([
  "preparing_personas",
  "running_respondents",
  "synthesizing",
]);

function OptionPreview({ option }: { option: TestDetails["options"][number] }) {
  return (
    <div className="bg-card rounded-lg border p-3">
      <p className="text-muted-foreground text-xs font-medium">
        {option.label}
      </p>
      {option.imageUrl ? (
        <Image
          src={option.imageUrl}
          alt={option.label}
          width={800}
          height={450}
          unoptimized
          className="bg-muted mt-2 aspect-video w-full rounded-md object-contain"
        />
      ) : "text" in option && option.text ? (
        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
          {option.text}
        </p>
      ) : null}
    </div>
  );
}

function RunningState({ details }: { details: TestDetails }) {
  const { test, progress } = details;
  const completed = progress?.completedRespondents ?? 0;
  const failed = progress?.failedRespondents ?? 0;
  const total = progress?.totalRespondents ?? test.respondentCount;
  const percentage = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const phases = [
    { status: "preparing_personas", label: "Build distinct personas" },
    { status: "running_respondents", label: "Collect independent responses" },
    { status: "synthesizing", label: "Synthesize evidence" },
  ];
  const phaseIndex = phases.findIndex((phase) => phase.status === test.status);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--blue-soft)] text-[var(--blue)]">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <div>
            <Badge tone="blue">Live</Badge>
            <h2 className="mt-2 text-xl font-semibold">
              {progress?.phaseLabel ?? "Preparing your test"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              This work runs durably in the background. You can leave this page
              and return at any time.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-sm">
            <span>Overall progress</span>
            <span className="font-medium">
              {completed + failed} / {total}
            </span>
          </div>
          <Progress className="h-2" value={percentage} />
        </div>
        <div className="mt-8 space-y-4">
          {phases.map((phase, index) => {
            const done = index < phaseIndex;
            const active = index === phaseIndex;
            return (
              <div
                key={phase.status}
                className="flex items-center gap-3 text-sm"
              >
                {done ? (
                  <CheckCircle2 className="size-4 text-[var(--green)]" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin text-[var(--blue)]" />
                ) : (
                  <CircleDashed className="text-muted-foreground size-4" />
                )}
                <span
                  className={cn(!active && !done && "text-muted-foreground")}
                >
                  {phase.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Immutable test snapshot</h2>
        {details.options.map((option) => (
          <OptionPreview key={option._id} option={option} />
        ))}
      </div>
    </div>
  );
}

function RespondentDialog({
  response,
  onClose,
}: {
  response: ResponseView | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(response)}
      onOpenChange={(open) => !open && onClose()}
    >
      {response && (
        <DialogContent>
          <DialogTitle>{response.persona.displayName}</DialogTitle>
          <DialogDescription>{response.persona.background}</DialogDescription>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{response.persona.familiarity}</Badge>
            <Badge>{response.persona.priceSensitivity}</Badge>
            {response.persona.behavioralTraits.map((trait) => (
              <Badge key={trait}>{trait}</Badge>
            ))}
          </div>
          <div className="mt-6 rounded-lg border p-4">
            <p className="text-muted-foreground text-xs font-medium">
              INTERNAL PERSPECTIVE
            </p>
            <p className="mt-2 text-sm leading-6 italic">
              “{response.persona.soul}”
            </p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs font-medium">GOALS</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {response.persona.goals.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                DECISION DRIVERS
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {response.persona.decisionDrivers.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="bg-muted mt-6 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">Selected {response.selection.label}</p>
              <Badge
                tone={
                  response.confidence === "high"
                    ? "green"
                    : response.confidence === "medium"
                      ? "amber"
                      : "neutral"
                }
              >
                {response.confidence} confidence
              </Badge>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              {response.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
            {response.objection && (
              <p className="text-muted-foreground mt-3 border-t pt-3 text-sm">
                <span className="text-foreground font-medium">Concern:</span>{" "}
                {response.objection}
              </p>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function ResponsesTable({ testId }: { testId: Id<"tests"> }) {
  const responses = useQuery(api.responses.list, { testId });
  const [search, setSearch] = useState("");
  const [confidence, setConfidence] = useState("all");
  const [selected, setSelected] = useState<ResponseView | null>(null);
  const filtered = useMemo(() => {
    if (!responses) return [];
    const query = search.trim().toLowerCase();
    return responses.filter((response) => {
      const matchesConfidence =
        confidence === "all" || response.confidence === confidence;
      const haystack = [
        response.persona.displayName,
        response.persona.background,
        response.selection.label,
        ...response.reasons,
        response.objection ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return matchesConfidence && (!query || haystack.includes(query));
    });
  }, [confidence, responses, search]);

  if (!responses) return <Skeleton className="h-64" />;
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Individual responses</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            User-facing conclusions only; private model reasoning is never
            shown.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              className="pl-8 sm:w-64"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search responses…"
            />
          </div>
          <Select
            className="w-32"
            value={confidence}
            onChange={(event) => setConfidence(event.target.value)}
          >
            <option value="all">All confidence</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">
            No responses match these filters.
          </p>
        ) : (
          filtered.map((response) => (
            <button
              key={response.id}
              onClick={() => setSelected(response)}
              className="hover:bg-accent/50 grid w-full gap-2 border-b px-4 py-3 text-left transition last:border-b-0 sm:grid-cols-[1fr_150px_120px_20px] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {response.persona.displayName}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {response.reasons[0]}
                </p>
              </div>
              <p className="text-sm">{response.selection.label}</p>
              <Badge
                tone={
                  response.confidence === "high"
                    ? "green"
                    : response.confidence === "medium"
                      ? "amber"
                      : "neutral"
                }
              >
                {response.confidence}
              </Badge>
              <ChevronRight className="text-muted-foreground hidden size-4 sm:block" />
            </button>
          ))
        )}
      </div>
      <RespondentDialog response={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Results({ details }: { details: TestDetails }) {
  const report = details.report;
  if (!report) return <Skeleton className="h-[480px]" />;
  const optionById = new Map(
    details.options.map((option) => [option._id, option]),
  );
  const winningOption = report.winningOptionId
    ? optionById.get(report.winningOptionId)
    : undefined;
  const totalConfidence =
    report.confidenceDistribution.low +
    report.confidenceDistribution.medium +
    report.confidenceDistribution.high;
  return (
    <div className="space-y-9">
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6 sm:p-8">
          <Badge tone={report.outcomeLabel === "Winner" ? "green" : "amber"}>
            {report.outcomeLabel}
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {winningOption
              ? `${winningOption.label} leads`
              : report.outcomeLabel}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {report.executiveSummary}
          </p>
          <div className="mt-7 space-y-4">
            {report.optionResults.map((result) => {
              const option = optionById.get(result.optionId);
              return (
                <div key={result.optionId}>
                  <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                    <span className="truncate">
                      <span className="text-muted-foreground mr-2">
                        #{result.rank}
                      </span>
                      {option?.label}
                    </span>
                    <span className="font-medium">
                      {result.votes} · {formatPercent(result.percentage)}
                    </span>
                  </div>
                  <div className="bg-accent h-2 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        result.rank === 1
                          ? "bg-[var(--blue)]"
                          : "bg-muted-foreground/35",
                      )}
                      style={{ width: `${result.percentage * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium">
              RESULT STRENGTH
            </p>
            <p className="mt-2 text-xl font-semibold">{report.strengthLabel}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Based on {report.successfulResponses} stored responses
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-muted-foreground text-xs font-medium">
              CONFIDENCE MIX
            </p>
            <div className="bg-accent mt-4 flex h-2 overflow-hidden rounded-full">
              {(["high", "medium", "low"] as const).map((level) => (
                <div
                  key={level}
                  style={{
                    width: `${totalConfidence ? (report.confidenceDistribution[level] / totalConfidence) * 100 : 0}%`,
                  }}
                  className={cn(
                    level === "high"
                      ? "bg-[var(--green)]"
                      : level === "medium"
                        ? "bg-[var(--amber)]"
                        : "bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 text-center text-xs">
              <div>
                <b>{report.confidenceDistribution.high}</b>
                <span className="text-muted-foreground block">High</span>
              </div>
              <div>
                <b>{report.confidenceDistribution.medium}</b>
                <span className="text-muted-foreground block">Medium</span>
              </div>
              <div>
                <b>{report.confidenceDistribution.low}</b>
                <span className="text-muted-foreground block">Low</span>
              </div>
            </div>
          </Card>
          {report.refundCents > 0 && (
            <Card className="border-[var(--amber)]/25 bg-[var(--amber-soft)] p-5">
              <p className="text-sm font-medium">
                {formatMoney(report.refundCents)} returned
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Automatically refunded for respondent runs that failed after
                retries.
              </p>
            </Card>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--blue)]" />
            <h2 className="font-semibold">Why the leader worked</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            {report.winningReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-[var(--green)]" />
                {reason}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--amber)]" />
            <h2 className="font-semibold">Objections and ambiguity</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            {report.objections.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">How to improve every option</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {report.optionInsights.map((insight) => {
            const option = optionById.get(insight.optionId);
            return (
              <Card key={insight.optionId} className="p-5">
                <p className="font-medium">{option?.label}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--green)]">
                      STRENGTHS
                    </p>
                    <ul className="mt-2 space-y-1 text-sm leading-6">
                      {insight.strengths.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-destructive text-xs font-medium">
                      UNDERPERFORMED
                    </p>
                    <ul className="mt-2 space-y-1 text-sm leading-6">
                      {insight.weaknesses.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-4 border-t pt-4">
                  <p className="text-muted-foreground text-xs font-medium">
                    RECOMMENDATIONS
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6">
                    {insight.recommendations.map((item) => (
                      <li key={item}>→ {item}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {(report.segments.length > 0 || report.disagreements.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <h2 className="font-semibold">Audience patterns</h2>
            </div>
            <div className="mt-4 space-y-4">
              {report.segments.map((segment) => (
                <div key={segment.name}>
                  <p className="text-sm font-medium">{segment.name}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    {segment.pattern}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Evidence: {segment.evidence}
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Where the audience disagreed</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6">
              {report.disagreements.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Messaging implications</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            {report.implications.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Suggested next test</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            {report.nextTests.map((item) => (
              <li key={item}>→ {item}</li>
            ))}
          </ul>
        </Card>
      </section>

      <ResponsesTable testId={details.test._id} />

      <section className="bg-muted/50 rounded-lg border p-5">
        <p className="text-sm font-medium">Read this result with care</p>
        <ul className="text-muted-foreground mt-2 space-y-1 text-xs leading-5">
          {report.limitations.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function TestDetail({ testId }: { testId: Id<"tests"> }) {
  const router = useRouter();
  const details = useQuery(api.tests.get, { testId });
  const removeDraft = useMutation(api.tests.removeDraft);
  const [deleting, setDeleting] = useState(false);
  if (!details)
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-20" />
        <Skeleton className="h-[440px]" />
      </div>
    );

  async function deleteDraft() {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await removeDraft({ testId });
      toast.success("Draft deleted");
      router.push("/app/tests");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete draft",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/app/tests">
          <ArrowLeft /> All tests
        </Link>
      </Button>
      <PageHeader
        eyebrow={details.test.status.replaceAll("_", " ")}
        title={details.test.name}
        description={details.test.question}
        actions={
          details.test.status === "draft" ? (
            <>
              <Button asChild variant="blue">
                <Link href={`/app/tests/new?draft=${details.test._id}`}>
                  <FilePenLine /> Continue editing
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete draft"
                disabled={deleting}
                onClick={() => void deleteDraft()}
              >
                {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
            </>
          ) : undefined
        }
      />
      {details.test.status === "draft" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {details.options.map((option) => (
              <OptionPreview key={option._id} option={option} />
            ))}
          </div>
          <Card className="h-fit p-5">
            <Badge>Draft</Badge>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              This test has not been charged. Continue editing to review the
              audience, respondent count, and launch price.
            </p>
            <Button asChild className="mt-5 w-full" variant="outline">
              <Link href={`/app/tests/new?draft=${details.test._id}`}>
                Continue draft
              </Link>
            </Button>
          </Card>
        </div>
      )}
      {activeStatuses.has(details.test.status) && (
        <RunningState details={details} />
      )}
      {["completed", "partially_failed"].includes(details.test.status) && (
        <Results details={details} />
      )}
      {details.test.status === "failed" && (
        <Card className="p-8 text-center">
          <AlertTriangle className="text-destructive mx-auto size-7" />
          <h2 className="mt-3 text-lg font-semibold">
            This test could not finish
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
            {details.progress?.phaseLabel ??
              "The execution pipeline stopped after its bounded retries."}{" "}
            Any applicable refund was added to your ledger automatically.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/app/tests/new">Create another test</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
