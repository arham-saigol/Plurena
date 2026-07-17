"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Check, Image as ImageIcon, Plus, TextT, Trash, UploadSimple } from "@phosphor-icons/react";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type OptionDraft = { key: string; label: string; optionType: "text" | "image"; text: string; assetId?: Id<"assets">; fileName?: string };
type Audience = { name?: string; locations: string[]; description: string; gender: "female" | "mixed" | "male"; minAge: number; maxAge: number };
type Pricing = { version: string; panels: { size: number; priceCents: number; discountPercent: number }[] };
export type RerunSeed = { testId: Id<"tests">; title: string; testType: "compare" | "question"; options: OptionDraft[]; audience: Audience; panelSize: number; reusePanel?: boolean };

const steps = ["Type", "Content", "Audience", "Panel size", "Review"];
const genderLabels = ["Female", "Mixed", "Male"];
const genderValues = ["female", "mixed", "male"] as const;

export function NewTestDialog({ pricing, balanceCents, onClose, seed }: { pricing: Pricing; balanceCents: number; onClose(): void; seed?: RerunSeed }) {
  const router = useRouter();
  const launch = useMutation(api.tests.launch);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const finalizeImage = useAction(api.files.finalizeImage);
  const discardAsset = useMutation(api.files.discardAsset);
  const saveAudience = useMutation(api.audiences.save);
  const removeAudience = useMutation(api.audiences.remove);
  const savedAudiences = useQuery(api.audiences.list, {});
  const uploadedAssetIds = useRef(new Set<Id<"assets">>());
  const close = () => {
    for (const assetId of uploadedAssetIds.current) void discardAsset({ assetId }).catch(() => undefined);
    uploadedAssetIds.current.clear();
    onClose();
  };
  const [step, setStep] = useState(seed ? 1 : 0);
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [testType, setTestType] = useState<"compare" | "question">(seed?.testType ?? "compare");
  const [title, setTitle] = useState(seed?.title ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(seed?.options ?? [makeOption("A"), makeOption("B")]);
  const comparisonDraft = useRef<OptionDraft[]>(seed?.testType === "compare" ? seed.options : options.length >= 2 ? options : [makeOption("A"), makeOption("B")]);
  const questionDraft = useRef<OptionDraft[]>(seed?.testType === "question" ? seed.options : []);
  const [audience, setAudience] = useState<Audience>(seed?.audience ?? { locations: ["United States"], description: "", gender: "mixed", minAge: 22, maxAge: 55 });
  const initialIndex = Math.max(0, pricing.panels.findIndex((item) => item.size === (seed?.panelSize ?? 20)));
  const [panelIndex, setPanelIndex] = useState(initialIndex);
  const [saveName, setSaveName] = useState("");
  const [selectedAudienceId, setSelectedAudienceId] = useState<Id<"savedAudiences"> | "">("");
  const [reusePanel, setReusePanel] = useState(Boolean(seed?.reusePanel));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const quote = pricing.panels[panelIndex];
  const valid = useMemo(() => validateStep(step, testType, title, options, audience), [step, testType, title, options, audience]);

  const chooseType = (next: "compare" | "question") => {
    if (next === testType) return;
    if (testType === "compare") comparisonDraft.current = options;
    else questionDraft.current = options;
    setTestType(next);
    setOptions(next === "compare" ? comparisonDraft.current : questionDraft.current);
  };
  const updateOption = (index: number, patch: Partial<OptionDraft>) => setOptions((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));
  const addOption = () => options.length < 5 && setOptions((current) => [...current, makeOption(String.fromCharCode(65 + current.length))]);
  const discardDraftAsset = (assetId?: Id<"assets">) => {
    if (!assetId || !uploadedAssetIds.current.delete(assetId)) return;
    void discardAsset({ assetId }).catch(() => undefined);
  };
  const removeOption = (index: number) => {
    discardDraftAsset(options[index]?.assetId);
    setOptions((current) => current.filter((_, position) => position !== index));
  };
  const selectTextOption = (index: number) => {
    discardDraftAsset(options[index]?.assetId);
    updateOption(index, { optionType: "text", assetId: undefined, fileName: undefined });
  };
  const upload = async (index: number, file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Use a PNG, JPEG, or WebP image."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Images must be 8 MB or smaller."); return; }
    setBusy(true); setError("");
    try {
      const grant = await generateUploadUrl({});
      const response = await fetch(grant.uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("UPLOAD_FAILED");
      const payload = await response.json() as { storageId?: Id<"_storage"> };
      if (!payload.storageId) throw new Error("UPLOAD_FAILED");
      const assetId = await finalizeImage({ storageId: payload.storageId, uploadGrantId: grant.uploadGrantId });
      discardDraftAsset(options[index]?.assetId);
      uploadedAssetIds.current.add(assetId);
      updateOption(index, { assetId, fileName: file.name, optionType: "image", text: "" });
    } catch (cause) { setError(readError(cause, "Image upload failed.")); } finally { setBusy(false); }
  };
  const storeAudience = async () => {
    if (!saveName.trim()) { setError("Name this audience first."); return; }
    setBusy(true); setError("");
    try { await saveAudience({ name: saveName, criteria: { ...audience, name: saveName } }); setSaveName(""); } catch (cause) { setError(readError(cause, "Audience could not be saved.")); } finally { setBusy(false); }
  };
  const deleteAudience = async () => {
    if (!selectedAudienceId) return;
    setBusy(true); setError("");
    try { await removeAudience({ audienceId: selectedAudienceId }); setSelectedAudienceId(""); }
    catch (cause) { setError(readError(cause, "Audience could not be removed.")); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (balanceCents < quote.priceCents) { setError(`You need ${money(quote.priceCents - balanceCents)} more credit to launch.`); return; }
    setBusy(true); setError("");
    try {
      const result = await launch({
        clientRequestId,
        title,
        testType,
        options: options.map(({ label, optionType, text, assetId }) => ({ label, optionType, text: text || undefined, assetId })),
        audience,
        panelSize: quote.size,
        rerunOf: seed?.testId,
        reusePanel: seed ? reusePanel : false,
      });
      uploadedAssetIds.current.clear();
      router.push(`/tests/${result.testId}`);
    } catch (cause) { setError(readError(cause, "The test could not launch.")); setBusy(false); }
  };

  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}><DialogContent className="grid max-h-[min(92svh,820px)] w-[calc(100%-1.5rem)] max-w-3xl grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-0 overflow-hidden rounded-2xl border bg-background p-0 text-foreground shadow-2xl ring-0 sm:max-w-3xl" showCloseButton>
    <DialogHeader className="border-b px-5 py-5 pr-14 sm:px-7 sm:py-6"><p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{seed ? "Rerun test" : "New test"}</p><DialogTitle className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">{steps[step]}</DialogTitle><DialogDescription>Configure a focused study for your AI respondent panel.</DialogDescription></DialogHeader>
    <ol className="grid grid-cols-5 border-b bg-muted/25 px-3 sm:px-6" aria-label="Test creation progress">{steps.map((label, index) => <li key={label} className={cn("relative flex min-w-0 items-center justify-center gap-2 py-3 text-[11px] font-medium text-muted-foreground after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-primary after:transition-all", index === step && "text-foreground after:w-full", index < step && "text-foreground")} aria-current={index === step ? "step" : undefined}><span className={cn("grid size-5 shrink-0 place-items-center rounded-full border bg-background font-mono text-[9px]", index <= step && "border-primary text-primary", index < step && "bg-primary text-primary-foreground")}>{index < step ? <Check size={10} weight="bold" /> : index + 1}</span><span className="hidden truncate sm:inline">{label}</span></li>)}</ol>
    <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
      {step === 0 && <TypeStep value={testType} onChange={chooseType} />}
      {step === 1 && <ContentStep testType={testType} title={title} setTitle={setTitle} options={options} setOptions={setOptions} updateOption={updateOption} selectTextOption={selectTextOption} addOption={addOption} removeOption={removeOption} upload={upload} busy={busy} />}
      {step === 2 && <AudienceStep audience={audience} setAudience={setAudience} saved={savedAudiences ?? []} selectedId={selectedAudienceId} setSelectedId={setSelectedAudienceId} saveName={saveName} setSaveName={setSaveName} save={storeAudience} remove={deleteAudience} busy={busy} />}
      {step === 3 && <PanelStep pricing={pricing} panelIndex={panelIndex} setPanelIndex={setPanelIndex} locked={Boolean(seed && reusePanel)} />}
      {step === 4 && <ReviewStep testType={testType} title={title} options={options} audience={audience} quote={quote} balanceCents={balanceCents} seed={seed} reusePanel={reusePanel} setReusePanel={(value: boolean) => { setReusePanel(value); if (value && seed) { setPanelIndex(initialIndex); setAudience(seed.audience); } }} />}
    </div>
    {error && <p className="mx-5 mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:mx-7" role="alert">{error}</p>}
    <div className="flex items-center justify-between gap-3 border-t bg-muted/25 px-5 py-4 sm:px-7"><Button variant="ghost" disabled={step === 0 || busy} onClick={() => { setError(""); setStep((value) => value - 1); }}><ArrowLeft size={15} /> Back</Button>{step < 4 ? <Button className="min-w-28" disabled={!valid || busy} onClick={() => { setError(""); setStep((value) => value + 1); }}>Continue <ArrowRight size={15} /></Button> : <Button className="min-w-40" disabled={busy || balanceCents < quote.priceCents} onClick={submit}>{busy ? "Launching…" : `Launch for ${money(quote.priceCents)}`} <ArrowRight size={15} /></Button>}</div>
  </DialogContent></Dialog>;
}

function makeOption(label: string): OptionDraft { return { key: crypto.randomUUID(), label: `Option ${label}`, optionType: "text", text: "" }; }

function TypeStep({ value, onChange }: { value: "compare" | "question"; onChange(value: "compare" | "question"): void }) {
  const choices = [
    { id: "compare" as const, icon: TextT, title: "Compare concepts", description: "Test 2 to 5 pieces of copy or creative in a randomized order." },
    { id: "question" as const, icon: ImageIcon, title: "Ask a question", description: "Collect thoughtful, open-ended answers from every respondent." },
  ];
  return <div><div className="mb-5"><h2 className="text-sm font-semibold">What would you like to learn?</h2><p className="mt-1 text-sm text-muted-foreground">Choose the study format. You can refine the content in the next step.</p></div><div className="grid gap-3 sm:grid-cols-2">{choices.map((choice) => { const Icon = choice.icon; const selected = value === choice.id; return <Button key={choice.id} type="button" variant="outline" aria-pressed={selected} className={cn("h-auto min-h-40 items-start justify-start whitespace-normal rounded-xl p-5 text-left shadow-none transition-all", selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-background hover:border-primary/30 hover:bg-muted/35")} onClick={() => onChange(choice.id)}><span className="flex h-full flex-col items-start"><span className={cn("mb-8 grid size-9 place-items-center rounded-lg border bg-background text-muted-foreground", selected && "border-primary text-primary")}><Icon size={18} /></span><strong className="text-sm font-semibold text-foreground">{choice.title}</strong><span className="mt-2 text-xs leading-5 text-muted-foreground">{choice.description}</span></span></Button>; })}</div></div>;
}

interface ContentStepProps {
  testType: "compare" | "question";
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  options: OptionDraft[];
  setOptions: Dispatch<SetStateAction<OptionDraft[]>>;
  updateOption(index: number, patch: Partial<OptionDraft>): void;
  selectTextOption(index: number): void;
  addOption(): void;
  removeOption(index: number): void;
  upload(index: number, file?: File): Promise<void>;
  busy: boolean;
}

function ContentStep({ testType, title, setTitle, options, setOptions, updateOption, selectTextOption, addOption, removeOption, upload, busy }: ContentStepProps) {
  return <div className="space-y-6">
    <div className="space-y-2"><div className="flex items-center justify-between gap-4"><Label htmlFor="test-question">{testType === "compare" ? "Header question" : "Question"}</Label><span className="text-[11px] tabular-nums text-muted-foreground">{title.length}/300</span></div><Textarea id="test-question" className="min-h-24 resize-y rounded-lg bg-background text-sm" maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={testType === "compare" ? "Which option makes you most likely to buy?" : "What would make you switch from your current product?"} /></div>
    {testType === "question" && options.length === 0 && <Button variant="outline" className="h-10" onClick={() => setOptions([makeOption("context")])}><Plus size={15} /> Add supporting content</Button>}
    <div className="space-y-3">{options.map((option: OptionDraft, index: number) => <section className="rounded-xl border bg-muted/15 p-4 sm:p-5" key={option.key} aria-label={`${testType === "compare" ? "Option" : "Context"} ${index + 1}`}><div className="flex items-center gap-2"><Input className="h-9 flex-1 bg-background font-medium" value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} aria-label={`Option ${index + 1} label`} />{((testType === "compare" && options.length > 2) || testType === "question") && <Button variant="ghost" size="icon" onClick={() => removeOption(index)} aria-label={testType === "compare" ? "Remove option" : "Remove context"}><Trash size={15} /></Button>}</div><div className="my-3 flex w-fit rounded-lg border bg-background p-0.5"><Button className="h-7 rounded-md px-2.5" size="sm" variant={option.optionType === "text" ? "secondary" : "ghost"} onClick={() => selectTextOption(index)}><TextT size={14} /> Text</Button><label className={cn("inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-muted", option.optionType === "image" && "bg-secondary text-secondary-foreground")}><UploadSimple size={14} /> Image<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => upload(index, event.target.files?.[0])} /></label></div>{option.optionType === "text" ? <Textarea className="min-h-28 resize-y bg-background" value={option.text} onChange={(event) => updateOption(index, { text: event.target.value })} placeholder="Paste the copy or concept to test" /> : <div className={cn("flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed bg-background px-4 text-center", option.assetId && "border-emerald-500/30 bg-emerald-500/5")}><ImageIcon className="text-muted-foreground" size={20} /><span className="mt-2 text-xs font-medium">{option.fileName ?? "Choose a PNG, JPEG, or WebP image"}</span><small className="mt-1 text-[11px] text-muted-foreground">8 MB maximum</small></div>}</section>)}</div>
    {testType === "compare" && options.length < 5 && <Button variant="outline" className="h-10" onClick={addOption}><Plus size={15} /> Add option</Button>}
  </div>;
}

interface AudienceStepProps {
  audience: Audience;
  setAudience: Dispatch<SetStateAction<Audience>>;
  saved: Doc<"savedAudiences">[];
  selectedId: Id<"savedAudiences"> | "";
  setSelectedId(value: Id<"savedAudiences"> | ""): void;
  saveName: string;
  setSaveName: Dispatch<SetStateAction<string>>;
  save(): Promise<void>;
  remove(): Promise<void>;
  busy: boolean;
}

function AudienceStep({ audience, setAudience, saved, selectedId, setSelectedId, saveName, setSaveName, save, remove, busy }: AudienceStepProps) {
  const genderIndex = audience.gender === "female" ? 0 : audience.gender === "mixed" ? 1 : 2;
  return <div className="space-y-6">
    {saved.length > 0 && <section className="rounded-xl border bg-muted/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1 space-y-2"><Label>Saved audience</Label><Select value={selectedId || null} onValueChange={(value) => { const nextId = (value ?? "") as Id<"savedAudiences"> | ""; setSelectedId(nextId); const match = saved.find((item) => item._id === nextId); if (match) setAudience(match.criteria); }}><SelectTrigger className="w-full bg-background"><SelectValue placeholder="Choose saved criteria" /></SelectTrigger><SelectContent>{saved.map((item) => <SelectItem key={item._id} value={item._id}>{item.name}</SelectItem>)}</SelectContent></Select></div><Button variant="outline" disabled={!selectedId || busy} onClick={remove}><Trash size={14} /> Remove</Button></div></section>}
    <div className="space-y-2"><Label htmlFor="audience-locations">Target locations</Label><Input id="audience-locations" className="h-10 bg-background" value={audience.locations.join(", ")} onChange={(event) => setAudience({ ...audience, locations: event.target.value.split(",").map((item: string) => item.trim()) })} onBlur={() => setAudience({ ...audience, locations: audience.locations.filter(Boolean) })} placeholder="United States, Canada" /><p className="text-[11px] text-muted-foreground">Separate locations with commas.</p></div>
    <div className="space-y-2"><Label htmlFor="audience-description">Persona description</Label><Textarea id="audience-description" className="min-h-24 resize-y bg-background" value={audience.description} onChange={(event) => setAudience({ ...audience, description: event.target.value })} placeholder="Amazon buyers interested in home coffee equipment who compare reviews before buying" /><p className="text-[11px] text-muted-foreground">Describe behaviors, needs, and context—not sensitive personal traits.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><section className="rounded-xl border p-4 sm:p-5"><div className="mb-6 flex items-center justify-between"><Label>Gender mix</Label><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{genderLabels[genderIndex]}</span></div><Slider aria-label="Gender mix" aria-valuetext={genderLabels[genderIndex]} min={0} max={2} step={1} value={genderIndex} onValueChange={(value) => setAudience({ ...audience, gender: genderValues[Number(value)] })} /><div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>Female</span><span>Mixed</span><span>Male</span></div></section><section className="rounded-xl border p-4 sm:p-5"><div className="mb-6 flex items-center justify-between"><Label>Age range</Label><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">{audience.minAge}–{audience.maxAge}</span></div><Slider aria-label="Age range" getAriaLabel={(index) => index === 0 ? "Minimum age" : "Maximum age"} min={18} max={80} value={[audience.minAge, audience.maxAge]} onValueChange={(value) => { if (Array.isArray(value)) setAudience({ ...audience, minAge: value[0], maxAge: value[1] }); }} /><div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>18</span><span>80</span></div></section></div>
    <section className="rounded-xl border bg-muted/20 p-4"><Label htmlFor="audience-name">Save for later</Label><p className="mb-3 mt-1 text-xs text-muted-foreground">Reuse these targeting criteria in a future study.</p><div className="flex flex-col gap-2 sm:flex-row"><Input id="audience-name" className="h-9 flex-1 bg-background" value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="e.g. US coffee enthusiasts" /><Button variant="outline" disabled={busy || !saveName.trim()} onClick={save}>Save audience</Button></div></section>
  </div>;
}

interface PanelStepProps {
  pricing: Pricing;
  panelIndex: number;
  setPanelIndex: Dispatch<SetStateAction<number>>;
  locked: boolean;
}

function PanelStep({ pricing, panelIndex, setPanelIndex, locked }: PanelStepProps) {
  const selected = pricing.panels[panelIndex];
  return <div className="space-y-8"><div className="rounded-2xl border bg-muted/20 px-5 py-8 text-center"><span className="text-xs font-medium text-muted-foreground">{selected.size} respondents</span><strong className="mt-2 block text-4xl font-semibold tracking-[-0.05em] tabular-nums">{money(selected.priceCents)}</strong><small className={cn("mt-2 block text-xs", selected.discountPercent ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>{locked ? "Same-panel reruns keep the original panel size" : selected.discountPercent ? `${selected.discountPercent}% volume discount` : "$0.25 per response"}</small></div><div className="px-1 sm:px-3"><Slider aria-label="Panel size" aria-valuetext={`${selected.size} respondents`} min={0} max={pricing.panels.length - 1} step={1} value={panelIndex} disabled={locked} onValueChange={(value) => setPanelIndex(Number(value))} /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{pricing.panels.map((item, index) => { const active = index === panelIndex; return <Button variant="outline" key={item.size} disabled={locked && !active} aria-pressed={active} className={cn("h-auto min-h-20 flex-col gap-1 rounded-xl p-3 shadow-none", active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40")} onClick={() => setPanelIndex(index)}><b className="text-sm tabular-nums">{item.size}</b><span className="text-xs font-normal text-muted-foreground">{money(item.priceCents)}</span><small className={cn("text-[10px] font-normal", item.discountPercent ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>{item.discountPercent ? `−${item.discountPercent}%` : "Base"}</small></Button>; })}</div><p className="rounded-xl border bg-muted/20 px-4 py-3 text-center text-xs leading-5 text-muted-foreground">Plurena distributes the study across several model families. Image studies use vision-capable models only.</p></div>;
}

interface ReviewStepProps {
  testType: "compare" | "question";
  title: string;
  options: OptionDraft[];
  audience: Audience;
  quote: Pricing["panels"][number];
  balanceCents: number;
  seed?: RerunSeed;
  reusePanel: boolean;
  setReusePanel(value: boolean): void;
}

function ReviewStep({ testType, title, options, audience, quote, balanceCents, seed, reusePanel, setReusePanel }: ReviewStepProps) {
  const details = [
    { label: "Type", value: testType === "compare" ? "Comparison" : "Open question" },
    { label: "Panel", value: `${quote.size} respondents` },
  ];
  return <div className="space-y-4">{seed && <section><Label>Panel source</Label><div className="mt-2 grid gap-2 sm:grid-cols-2"><Button variant="outline" aria-pressed={!reusePanel} className={cn("h-auto items-start justify-start rounded-xl p-4 text-left shadow-none", !reusePanel && "border-primary bg-primary/5 ring-1 ring-primary")} onClick={() => setReusePanel(false)}><span><strong className="block text-sm">Fresh panel</strong><small className="mt-1 block font-normal text-muted-foreground">Generate new matching personas</small></span></Button><Button variant="outline" aria-pressed={reusePanel} className={cn("h-auto items-start justify-start rounded-xl p-4 text-left shadow-none", reusePanel && "border-primary bg-primary/5 ring-1 ring-primary")} onClick={() => setReusePanel(true)}><span><strong className="block text-sm">Same panel</strong><small className="mt-1 block font-normal text-muted-foreground">Reuse the original personas</small></span></Button></div></section>}<section className="overflow-hidden rounded-xl border"><dl className="grid sm:grid-cols-2">{details.map((item) => <div className="border-b p-4 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0" key={item.label}><dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</dt><dd className="mt-1 text-sm font-semibold">{item.value}</dd></div>)}<div className="border-b p-4 sm:col-span-2"><dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Question</dt><dd className="mt-1 text-sm font-semibold leading-6">{title}</dd></div>{options.length > 0 && <div className="border-b p-4 sm:col-span-2"><dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Content</dt><dd className="mt-1 text-sm font-semibold">{options.length} {options.length === 1 ? "item" : "options"}</dd><p className="mt-1 text-xs text-muted-foreground">{options.map((item: OptionDraft) => `${item.label} · ${item.optionType}`).join(" / ")}</p></div>}<div className="p-4 sm:col-span-2"><dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Audience</dt><dd className="mt-1 text-sm font-semibold leading-6">{audience.description}</dd><p className="mt-1 text-xs text-muted-foreground">{audience.locations.join(", ")} · {audience.minAge}–{audience.maxAge} · {audience.gender}</p></div></dl></section><section className="grid grid-cols-3 overflow-hidden rounded-xl border bg-muted/25"><div className="p-4"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span><strong className="mt-1 block text-sm tabular-nums">{money(balanceCents)}</strong></div><div className="border-x p-4 text-center"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Final cost</span><strong className="mt-1 block text-sm tabular-nums">{money(quote.priceCents)}</strong></div><div className="p-4 text-right"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">After launch</span><strong className={cn("mt-1 block text-sm tabular-nums", balanceCents < quote.priceCents && "text-destructive")}>{money(balanceCents - quote.priceCents)}</strong></div></section>{balanceCents < quote.priceCents && <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="status">Insufficient credit. Close this dialog and add balance from the header.</p>}<p className="px-2 text-center text-[11px] leading-5 text-muted-foreground">Plurena uses your study material to design an AI-generated hypothesis panel with decision-relevant behavioral segments. Coverage weights are not population prevalence estimates.</p></div>;
}

function validateStep(step: number, type: string, title: string, options: OptionDraft[], audience: Audience) {
  if (step === 0) return Boolean(type);
  if (step === 1) return title.trim().length >= 4 && (type === "question" ? options.every(validOption) : options.length >= 2 && options.every(validOption));
  if (step === 2) return audience.locations.some(Boolean) && audience.description.trim().length >= 4 && audience.minAge < audience.maxAge;
  return true;
}
function validOption(option: OptionDraft) { return option.optionType === "text" ? option.text.trim().length > 0 : Boolean(option.assetId); }
const serverErrorMessages: Record<string, string> = {
  INSUFFICIENT_CREDIT: "Your balance is too low for this panel. Add balance and try again.",
  TOO_MANY_ACTIVE_TESTS: "You already have two active tests. Wait for one to finish before launching another.",
  INVALID_AUDIENCE_NAME: "Use an audience name between 1 and 60 characters.",
  INVALID_AUDIENCE_DESCRIPTION: "Describe the audience in 4 to 600 characters.",
  INVALID_AUDIENCE: "Check the audience locations and description, then try again.",
  AUDIENCE_LIMIT_REACHED: "You can save up to 50 audiences. Remove one before saving another.",
  INVALID_AGE_RANGE: "Choose an age range from 18 to 80.",
  INVALID_LOCATIONS: "Add between 1 and 10 valid audience locations.",
  UNSUPPORTED_IMAGE_TYPE: "Use a valid PNG, JPEG, or WebP image.",
  IMAGE_TOO_LARGE: "Images must be 8 MB or smaller.",
  UPLOAD_RATE_LIMIT: "Too many recent uploads. Wait a little and try again.",
  ASSET_LIMIT_REACHED: "Your image library is full. Remove an image before uploading another.",
  INVALID_UPLOAD_GRANT: "The image upload expired. Try uploading the image again.",
  INVALID_TITLE: "Enter a question between 4 and 300 characters.",
  COMPARE_REQUIRES_2_TO_5_OPTIONS: "Comparison tests need between 2 and 5 options.",
  QUESTION_ACCEPTS_ONE_CONTEXT_ITEM: "Open questions can include at most one supporting item.",
  CONTENT_TOO_LONG: "Shorten the study content and try again.",
  INVALID_PANEL_SIZE: "Choose one of the available panel sizes.",
  SAME_PANEL_SIZE_MISMATCH: "A same-panel rerun must use the original panel size.",
  SAME_PANEL_AUDIENCE_MISMATCH: "A same-panel rerun must use the original audience criteria.",
  SAME_PANEL_NOT_READY: "The original audience panel is not ready to reuse.",
  INVALID_OPTION_TEXT: "Add valid text for every text option.",
  IMAGE_REQUIRED: "Upload an image for every image option.",
  IDEMPOTENCY_KEY_REUSED: "This launch request changed while it was being submitted. Close the dialog and try again.",
  NOT_FOUND: "The source test or image is no longer available.",
  UNAUTHENTICATED: "Your session expired. Sign in again and retry.",
  USER_NOT_INITIALIZED: "Your account is still being prepared. Wait a moment and try again.",
  LOCATION_REQUIRED: "Add at least one audience location.",
};

function readError(cause: unknown, fallback: string) {
  if (!(cause instanceof Error)) return fallback;
  const code = Object.keys(serverErrorMessages).find((knownCode) => cause.message.includes(knownCode));
  return code ? serverErrorMessages[code] : fallback;
}
