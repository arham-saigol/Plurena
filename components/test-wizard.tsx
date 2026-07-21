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
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCredits } from "@/lib/utils";

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
  respondentCounts: ReadonlyArray<RespondentCount>;
  models: Array<{ key: ModelKey; label: string; vision: boolean }>;
};

type DraftDetails = {
  test: Doc<"tests">;
  options: Array<
    (Doc<"testOptions"> | Doc<"snapshotOptions">) & {
      imageUrl?: string | null;
    }
  >;
};

const steps = ["Test", "Options", "Audience", "Review"];
const stepDetails = [
  "Frame the decision",
  "Add alternatives",
  "Shape the panel",
  "Confirm and launch",
];

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
  const configuration = useQuery(api.tests.configuration);
  const currentUser = useQuery(api.users.current);
  const draft = useQuery(api.tests.get, draftId ? { testId: draftId } : "skip");

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
  currentUser: { creditBalance: number };
  draftId?: Id<"tests">;
  draft?: DraftDetails;
}) {
  const router = useRouter();
  const saveDraftMutation = useMutation(api.tests.saveDraft);
  const launchMutation = useMutation(api.tests.launch);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const finalizeUpload = useMutation(api.uploads.finalizeUpload);
  const removeUpload = useMutation(api.uploads.removeUpload);
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
          assetId: "assetId" in option ? option.assetId : undefined,
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
  const previewUrls = useRef(new Set<string>());
  const assetIds = useRef(
    new Set(
      options.flatMap((option) => (option.assetId ? [option.assetId] : [])),
    ),
  );
  const removeUploadRef = useRef(removeUpload);

  useEffect(() => {
    removeUploadRef.current = removeUpload;
  }, [removeUpload]);

  useEffect(
    () => () => {
      for (const assetId of assetIds.current) {
        void removeUploadRef.current({ assetId }).catch(() => undefined);
      }
      assetIds.current.clear();
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current.clear();
    },
    [],
  );

  function revokePreviewUrl(previewUrl?: string) {
    if (!previewUrl || !previewUrls.current.delete(previewUrl)) return;
    URL.revokeObjectURL(previewUrl);
  }

  function releaseUpload(assetId?: Id<"uploadedAssets">) {
    if (!assetId) return;
    assetIds.current.delete(assetId);
    void removeUpload({ assetId }).catch(() => undefined);
  }

  const creditCost = respondentCount;
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
    for (const option of options) {
      revokePreviewUrl(option.previewUrl);
      releaseUpload(option.assetId);
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
      const previewUrl = URL.createObjectURL(file);
      assetIds.current.add(assetId);
      previewUrls.current.add(previewUrl);
      revokePreviewUrl(option.previewUrl);
      releaseUpload(option.assetId);
      updateOption(option.key, {
        uploading: false,
        assetId,
        filename: file.name,
        previewUrl,
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
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow={testId ? "Saved draft" : "New test"}
        title={testId ? "Continue the decision" : "What do you need to decide?"}
        description="Keep the question focused. Plurena will make the audience varied, not the brief vague."
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

      <div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-26 space-y-5">
            <ol className="space-y-1" aria-label="Test creation steps">
              {steps.map((label, index) => (
                <li key={label}>
                  <button
                    onClick={() => index <= step && setStep(index)}
                    disabled={index > step}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition",
                      index === step
                        ? "bg-card shadow-[var(--shadow-sm)]"
                        : "text-muted-foreground hover:bg-accent/55",
                    )}
                    aria-current={step === index ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                        index < step &&
                          "border-[var(--green)]/20 bg-[var(--green-soft)] text-[var(--green)]",
                        index === step &&
                          "border-[var(--cta)] bg-[var(--cta)] text-[var(--cta-foreground)]",
                      )}
                    >
                      {index < step ? (
                        <Check className="size-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span>
                      <span className="text-foreground block text-sm font-semibold">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-[11px]">
                        {stepDetails[index]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="bg-card rounded-xl border p-4 shadow-[var(--shadow-sm)]">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                Available
              </p>
              <p className="mt-1 text-sm font-bold">
                {formatCredits(currentUser.creditBalance)}
              </p>
              <p className="text-muted-foreground mt-1.5 text-[11px] leading-4">
                One credit runs one respondent. Nothing is charged until launch.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <ol
            className="grid grid-cols-4 gap-1 md:hidden"
            aria-label="Test creation steps"
          >
            {steps.map((label, index) => (
              <li key={label}>
                <button
                  onClick={() => index <= step && setStep(index)}
                  disabled={index > step}
                  className="w-full text-left"
                  aria-current={step === index ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "mb-2 block h-1 rounded-full",
                      index <= step ? "bg-[var(--cta)]" : "bg-accent",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11px]",
                      index === step
                        ? "font-semibold"
                        : "text-muted-foreground",
                    )}
                  >
                    {index + 1}. {label}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <Card className="p-5 sm:p-7 lg:p-8">
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
                            "border-[var(--cta)] ring-2 ring-[var(--cta)]/20",
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
                    Use two to eight distinct alternatives. Order is preserved
                    in the immutable test snapshot.
                  </p>
                </div>
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div
                      key={option.key}
                      className="rounded-lg border p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-accent grid size-6 shrink-0 place-items-center rounded text-xs font-medium">
                          {index + 1}
                        </span>
                        <Input
                          aria-label={`Label for option ${index + 1}`}
                          value={option.label}
                          maxLength={80}
                          onChange={(event) =>
                            updateOption(option.key, {
                              label: event.target.value,
                            })
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
                          onClick={() => {
                            revokePreviewUrl(option.previewUrl);
                            releaseUpload(option.assetId);
                            setOptions((current) =>
                              current.filter((item) => item.key !== option.key),
                            );
                          }}
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
                            updateOption(option.key, {
                              text: event.target.value,
                            })
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
                                  {option.uploading
                                    ? "Uploading…"
                                    : "Upload image"}
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
                        inside the audience. Avoid broad labels when
                        motivations, constraints, or category familiarity matter
                        more.
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
                    Launching creates an immutable snapshot and charges your
                    balance once.
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
                      {configuration.respondentCounts.map((count) => (
                        <option key={count} value={count}>
                          {count} respondents — {formatCredits(count)}
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
                      <WalletCards className="size-4" /> Available credits
                    </div>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCredits(currentUser.creditBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Sparkles className="size-4" /> Test cost
                    </div>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatCredits(creditCost)}
                    </p>
                  </div>
                </div>
                {currentUser.creditBalance < creditCost && (
                  <div className="rounded-lg border border-[var(--amber)]/25 bg-[var(--amber-soft)] p-4 text-sm">
                    <p className="font-medium">
                      You do not have enough credits to launch this test.
                    </p>
                    <Link
                      href="/app/billing"
                      className="mt-1 inline-flex text-[var(--amber)] underline underline-offset-2"
                    >
                      Get credits to continue
                    </Link>
                  </div>
                )}
                <div className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-xs leading-5">
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--green)]" />{" "}
                  Credit cost, respondent count, question, options, audience,
                  context, and model routing are frozen when execution starts.
                </div>
              </div>
            )}
          </Card>

          <div className="bg-background/94 sticky bottom-20 z-10 flex items-center justify-between rounded-xl border p-2 shadow-[var(--shadow-sm)] backdrop-blur-xl lg:bottom-4">
            <Button
              variant="ghost"
              disabled={step === 0 || saving}
              onClick={() => setStep((current) => current - 1)}
            >
              <ArrowLeft /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button
                variant="accent"
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
                variant="accent"
                size="lg"
                onClick={() => void launch()}
                disabled={
                  saving || !complete || currentUser.creditBalance < creditCost
                }
              >
                {saving ? <Loader2 className="animate-spin" /> : <Sparkles />}{" "}
                Launch for {formatCredits(creditCost)}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
