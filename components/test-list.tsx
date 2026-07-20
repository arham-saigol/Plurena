"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  ImageIcon,
  Plus,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  running_respondents: { label: "Running", tone: "blue" },
  synthesizing: { label: "Synthesizing", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  partially_failed: { label: "Partial results", tone: "amber" },
  failed: { label: "Failed", tone: "red" },
};

export function TestList({ tests }: { tests: Array<DashboardTest> }) {
  if (tests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-14 text-center">
        <div className="bg-accent mx-auto grid size-11 place-items-center rounded-lg">
          <FlaskConical className="size-5" />
        </div>
        <h2 className="mt-4 font-semibold">Create your first audience test</h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm leading-6">
          Compare marketing options and learn why different audience
          perspectives choose each one.
        </p>
        <Button asChild variant="blue" className="mt-5">
          <Link href="/app/tests/new">
            <Plus /> New test
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {tests.map((test) => {
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
            key={test._id}
            href={`/app/tests/${test._id}`}
            className="group hover:bg-accent/55 grid gap-3 border-b px-4 py-4 transition last:border-b-0 sm:grid-cols-[1fr_150px_160px_28px] sm:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="bg-accent text-muted-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-md">
                {test.optionType === "image" ? (
                  <ImageIcon className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{test.name}</p>
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
                      {completed + failed}/{total}
                    </span>
                    <span>{Math.round(percent)}%</span>
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
            <ArrowRight className="text-muted-foreground hidden size-4 transition group-hover:translate-x-0.5 sm:block" />
          </Link>
        );
      })}
    </div>
  );
}
