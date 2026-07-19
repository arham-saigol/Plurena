"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMoney } from "@/lib/utils";

type ModelKey = Doc<"tests">["respondentModel"];
type OptionType = Doc<"tests">["optionType"];
type RespondentCount = Doc<"tests">["respondentCount"];

type WizardOption = {
  key: string;
  label: string;
  text: string;
  assetId?: Id<"uploadedAssets">;
  previewUrl?: string;
  filename?: string;
  uploading?: boolean;
};

type Configuration = {
  pricing: Array<{ respondentCount: RespondentCount; priceCents: number }>;
  models: Array<{ key: ModelKey; label: string; vision: boolean }>;
};

type DraftDetails = {
  test: Doc<"tests">;
  options: Array<Doc<"testOptions"> & { imageUrl?: string | null }>;
};

const steps = ["Test", "Options", "Audience", "Review"];

function randomKey() {
  return typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : String(Date.now());
}

function newOption(index: number): WizardOption {
  return {
    key: randomKey(),
    label: `Option ${String.fromCharCode(65 + index)}`,
    text: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function TestWizard() {
  const searchParams = useSearchParams();
  const draftParam = searchParams.get("draft");
  const draftId = draftParam ? (draftParam as Id<"tests">) : undefined;
  const configuration = useQuery(api.tests.configuration) as
    Configuration | undefined;
  const currentUser = useQuery(api.users.current) as
    { balanceCents: number } | undefined;
  const draft = useQuery(
    api.tests.get,
    draftId ? { testId: draftId } : "skip",
  ) as DraftDetails | undefined;

  if (!configuration || !currentUser || (draftId && !draft)) {
    return <WizardSkeleton />;
  }
  if (draft && draft.test.status !== "draft") {
    return <RedirectToTest testId={draft.test._id} />;
  }
  return (
    <TestWizardForm
      key={draft?.test._id ?? "new"}
      configuration={configuration}
      currentUser={currentUser}
      draftId={draftId}
      draft={draft}
    />
  );
}

function RedirectToTest({ testId }: { testId: Id<"tests"> }) {
  const router = useRouter();
  useEffect(() => router.replace(`/app/tests/${testId}`), [router, testId]);
  return <WizardSkeleton />;
}

function WizardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-[460px] w-full" />
    </div>
  );
}

function TestWizardForm({
  configuration,
  currentUser,
  draftId,
  draft,
}: {
  configuration: Configuration;
  currentUser: { balanceCents: number };
  draftId?: Id<"tests">;
  draft?: DraftDetails;
}) {
  const router = useRouter();
  const saveDraftMutation = useMutation(api.tests.saveDraft);
  const launchMutation = useMutation(api.tests.launch);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const finalizeUpload = useMutation(api.uploads.finalizeUpload);
  const [step, setStep] = useState(0);
  const [testId, setTestId] = useState<Id<"tests"> | undefined>(draftId);
  const [name, setName] = useState(draft?.test.name ?? "");
  const [question, setQuestion] = useState(draft?.test.question ?? "");
  const [optionType, setOptionType] = useState<OptionType>(
    draft?.test.optionType ?? "text",
  );
  const [options, setOptions] = useState<Array<WizardOption>>(() =>
    draft
      ? draft.options.map((option) => ({
          key: option._id,
          label: option.label,
          text: option.text ?? "",
          assetId: option.assetId,
          previewUrl: option.imageUrl ?? undefined,
          filename: option.filename,
        }))
      : [newOption(0), newOption(1)],
  );
  const [audience, setAudience] = useState(draft?.test.audience ?? "");
  const [context, setContext] = useState(draft?.test.context ?? "");
  const [respondentCount, setRespondentCount] = useState<RespondentCount>(
    draft?.test.respondentCount ?? 20,
  );
  const [respondentModel, setRespondentModel] = useState<ModelKey>(
    draft?.test.respondentModel ?? "deepseek_v4_flash",
  );
  const [saving, setSaving] = useState(false);

  const priceCents = useMemo(
    () =>
      configuration?.pricing.find(
        (item) => item.respondentCount === respondentCount,
      )?.priceCents,
    [configuration, respondentCount],
  );
  const eligibleModels = configuration?.models.filter(
    (model) => optionType === "text" || model.vision,
  );
  const optionsComplete =
    options.length >= 2 &&
    options.every((option) =>
      optionType === "text"
        ? option.label.trim() && option.text.trim()
        : option.label.trim() && option.assetId && !option.uploading,
    );
  const complete = Boolean(
    name.trim() && question.trim() && audience.trim() && optionsComplete,
  );

  function setType(nextType: OptionType) {
    if (nextType === optionType) return;
    const selected = configuration.models.find(
      (model) => model.key === respondentModel,
    );
    if (nextType === "image" && selected && !selected.vision) {
      setRespondentModel(
        configuration.models.find((model) => model.vision)?.key ?? "minimax_m3",
      );
    }
    setOptionType(nextType);
    setOptions([newOption(0), newOption(1)]);
  }

  function updateOption(key: string, patch: Partial<WizardOption>) {
    setOptions((current) =>
      current.map((option) =>
        option.key === key ? { ...option, ...patch } : option,
      ),
    );
  }

  function moveOption(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    setOptions((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function uploadImage(
    option: WizardOption,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Images must be 8 MB or smaller.");
      return;
    }
    updateOption(option.key, { uploading: true });
    try {
      const uploadUrl = (await generateUploadUrl({})) as string;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const body: unknown = await response.json();
      if (!isRecord(body) || typeof body.storageId !== "string") {
        throw new Error("Upload response was invalid");
      }
      const assetId = (await finalizeUpload({
        storageId: body.storageId as Id<"_storage">,
        filename: file.name,
      })) as Id<"uploadedAssets">;
      updateOption(option.key, {
        uploading: false,
        assetId,
        filename: file.name,
        previewUrl: URL.createObjectURL(file),
      });
      toast.success("Image uploaded securely");
    } catch (error) {
      updateOption(option.key, { uploading: false });
      toast.error(
        error instanceof Error ? error.message : "Image upload failed",
      );
    }
  }

  function validationMessage() {
    if (!name.trim()) return "Add a clear test name.";
    if (!question.trim()) return "Add the decision question.";
    if (!optionsComplete)
      return optionType === "text"
        ? "Complete at least two text options."
        : "Upload and label at least two images.";
    if (!audience.trim()) return "Describe the audience this decision is for.";
    return undefined;
  }

  async function saveDraft() {
    const error = validationMessage();
    if (error) {
      toast.error(error);
      return undefined;
    }
    setSaving(true);
    try {
      const id = (await saveDraftMutation({
        testId,
        name,
        question,
        optionType,
        audience,
        context: context.trim() || undefined,
        respondentCount,
        respondentModel,
        options: options.map((option) =>
          optionType === "text"
            ? { kind: "text" as const, label: option.label, text: option.text }
            : {
                kind: "image" as const,
                label: option.label,
                assetId: option.assetId!,
              },
        ),
      })) as Id<"tests">;
      setTestId(id);
      toast.success("Draft saved");
      return id;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save draft",
      );
      return undefined;
    } finally {
      setSaving(false);
    }
  }

  async function launch() {
    const id = await saveDraft();
    if (!id) return;
    setSaving(true);
    try {
      await launchMutation({ testId: id });
      toast.success("Test launched");
      router.push(`/app/tests/${id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not launch test",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PageHeader
        eyebrow={testId ? "Draft" : "New test"}
        title={testId ? "Continue your test" : "What do you want to learn?"}
        description="The strongest studies start with a focused question and a specific audience."
        actions={
          <Button
            variant="outline"
            onClick={() => void saveDraft()}
            disabled={saving || !complete}
          >
            {saving ? <Loader2 className="animate-spin" /> : null} Save draft
          </Button>
        }
      />

      <ol className="grid grid-cols-4 gap-1" aria-label="Test creation steps">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              onClick={() => index <= step && setStep(index)}
              className="w-full text-left"
              aria-current={step === index ? "step" : undefined}
            >
              <span
                className={cn(
                  "mb-2 block h-1 rounded-full",
                  index <= step ? "bg-foreground" : "bg-accent",
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  index === step ? "font-medium" : "text-muted-foreground",
                )}
              >
                {index + 1}. {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Frame the test</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Name the decision and ask one question the panel can answer
                clearly.
              </p>
            </div>
            <Field
              label="Test name"
              htmlFor="test-name"
              hint={`${name.length}/120`}
            >
              <Input
                id="test-name"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Spring campaign headline"
                autoFocus
              />
            </Field>
            <Field
              label="Question"
              htmlFor="question"
              hint={`${question.length}/500`}
            >
              <Textarea
                id="question"
                maxLength={500}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Which hero message would make you most interested in learning more, and why?"
              />
            </Field>
            <Field label="Option format">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    type: "text" as const,
                    icon: FileText,
                    title: "Text",
                    description: "Copy, headlines, offers, or positioning",
                  },
                  {
                    type: "image" as const,
                    icon: ImageIcon,
                    title: "Images",
                    description: "Creative, layouts, or visual concepts",
                  },
                ].map(({ type, icon: Icon, title, description }) => (
                  <button
                    key={type}
                    onClick={() => setType(type)}
                    className={cn(
                      "hover:bg-accent/50 rounded-lg border p-4 text-left transition",
                      optionType === type &&
                        "border-foreground ring-foreground ring-1",
                    )}
                  >
                    <Icon className="size-5" />
                    <p className="mt-5 text-sm font-medium">{title}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {description}
                    </p>
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Add the options</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Use two to eight distinct alternatives. Order is preserved in
                the immutable test snapshot.
              </p>
            </div>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={option.key} className="rounded-lg border p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-accent grid size-6 shrink-0 place-items-center rounded text-xs font-medium">
                      {index + 1}
                    </span>
                    <Input
                      aria-label={`Label for option ${index + 1}`}
                      value={option.label}
                      maxLength={80}
                      onChange={(event) =>
                        updateOption(option.key, { label: event.target.value })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move option up"
                      disabled={index === 0}
                      onClick={() => moveOption(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move option down"
                      disabled={index === options.length - 1}
                      onClick={() => moveOption(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove option"
                      disabled={options.length <= 2}
                      onClick={() =>
                        setOptions((current) =>
                          current.filter((item) => item.key !== option.key),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {optionType === "text" ? (
                    <Textarea
                      className="mt-3 min-h-28"
                      aria-label={`Text for option ${index + 1}`}
                      value={option.text}
                      maxLength={5_000}
                      onChange={(event) =>
                        updateOption(option.key, { text: event.target.value })
                      }
                      placeholder="Paste the exact copy respondents should evaluate…"
                    />
                  ) : (
                    <div className="mt-3">
                      {option.previewUrl ? (
                        <div className="bg-muted relative overflow-hidden rounded-md border">
                          <Image
                            src={option.previewUrl}
                            alt={option.label || `Option ${index + 1}`}
                            width={960}
                            height={540}
                            unoptimized
                            className="aspect-video w-full object-contain"
                          />
                          <label className="bg-background/95 absolute right-2 bottom-2 inline-flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-xs font-medium shadow-sm">
                            <Upload className="size-3.5" /> Replace
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(event) =>
                                void uploadImage(option, event)
                              }
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="bg-muted/40 hover:bg-muted grid min-h-40 cursor-pointer place-items-center rounded-md border border-dashed text-center">
                          <span>
                            {option.uploading ? (
                              <Loader2 className="mx-auto size-5 animate-spin" />
                            ) : (
                              <Upload className="mx-auto size-5" />
                            )}
                            <span className="mt-2 block text-sm font-medium">
                              {option.uploading ? "Uploading…" : "Upload image"}
                            </span>
                            <span className="text-muted-foreground mt-1 block text-xs">
                              JPEG, PNG, or WebP · up to 8 MB
                            </span>
                          </span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={option.uploading}
                            onChange={(event) =>
                              void uploadImage(option, event)
                            }
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <Button
                variant="outline"
                onClick={() =>
                  setOptions((current) => [
                    ...current,
                    newOption(current.length),
                  ])
                }
              >
                <Plus /> Add option
              </Button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-[var(--blue)]/20 bg-[var(--blue-soft)] p-4">
              <div className="flex gap-3">
                <Users className="mt-0.5 size-5 shrink-0 text-[var(--blue)]" />
                <div>
                  <h2 className="font-semibold">
                    Audience quality drives answer quality
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Describe the shared situation and meaningful differences
                    inside the audience. Avoid broad labels when motivations,
                    constraints, or category familiarity matter more.
                  </p>
                </div>
              </div>
            </div>
            <Field
              label="Target audience"
              htmlFor="audience"
              hint={`${audience.length}/4000`}
            >
              <Textarea
                id="audience"
                className="min-h-44"
                maxLength={4_000}
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Growth-stage B2B SaaS marketing leaders who own pipeline targets, have tried attribution tools before, and are skeptical of long implementation cycles. Include a mix of hands-on operators and team leads…"
              />
            </Field>
            <Field
              label="Additional product or situation context"
              htmlFor="context"
              hint="Optional"
            >
              <Textarea
                id="context"
                maxLength={4_000}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="What the product does, price point, channel, campaign goal, constraints, or anything else needed to make a fair judgment…"
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Review and launch</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Launching creates an immutable snapshot and charges your balance
                once.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Respondents">
                <Select
                  value={respondentCount}
                  onChange={(event) =>
                    setRespondentCount(
                      Number(event.target.value) as RespondentCount,
                    )
                  }
                >
                  {configuration.pricing.map((item) => (
                    <option
                      key={item.respondentCount}
                      value={item.respondentCount}
                    >
                      {item.respondentCount} respondents —{" "}
                      {formatMoney(item.priceCents)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Respondent model">
                <Select
                  value={respondentModel}
                  onChange={(event) =>
                    setRespondentModel(event.target.value as ModelKey)
                  }
                >
                  {eligibleModels?.map((model) => (
                    <option key={model.key} value={model.key}>
                      {model.label}
                      {model.vision ? " · vision" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="divide-y rounded-lg border">
              {[
                ["Test", name],
                ["Question", question],
                ["Options", `${options.length} ${optionType} options`],
                ["Audience", audience],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[110px_1fr]"
                >
                  <p className="text-muted-foreground text-xs font-medium">
                    {label}
                  </p>
                  <p className="text-sm leading-6">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <WalletCards className="size-4" /> Available balance
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  {formatMoney(currentUser.balanceCents)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Sparkles className="size-4" /> Test price
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  {priceCents !== undefined ? formatMoney(priceCents) : "—"}
                </p>
              </div>
            </div>
            {priceCents !== undefined &&
              currentUser.balanceCents < priceCents && (
                <div className="rounded-lg border border-[var(--amber)]/25 bg-[var(--amber-soft)] p-4 text-sm">
                  <p className="font-medium">
                    Your balance is too low to launch this test.
                  </p>
                  <Link
                    href="/app/billing"
                    className="mt-1 inline-flex text-[var(--amber)] underline underline-offset-2"
                  >
                    Add funds to continue
                  </Link>
                </div>
              )}
            <div className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-xs leading-5">
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--green)]" />{" "}
              Price, respondent count, question, options, audience, context, and
              model routing are frozen when execution starts.
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 0 || saving}
          onClick={() => setStep((current) => current - 1)}
        >
          <ArrowLeft /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button
            variant="blue"
            onClick={() => setStep((current) => current + 1)}
            disabled={
              (step === 0 && (!name.trim() || !question.trim())) ||
              (step === 1 && !optionsComplete)
            }
          >
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button
            variant="blue"
            size="lg"
            onClick={() => void launch()}
            disabled={
              saving ||
              !complete ||
              priceCents === undefined ||
              currentUser.balanceCents < priceCents
            }
          >
            {saving ? <Loader2 className="animate-spin" /> : <Sparkles />}{" "}
            Launch for{" "}
            {priceCents !== undefined ? formatMoney(priceCents) : "—"}
          </Button>
        )}
      </div>
    </div>
  );
}
