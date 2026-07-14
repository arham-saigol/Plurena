"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Check, Image as ImageIcon, Plus, TextT, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { money } from "@/lib/format";
import { useDialogA11y } from "@/lib/use-dialog-a11y";

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
  const dialogRef = useDialogA11y(close);
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

  return <div className="dialog-backdrop"><section ref={dialogRef} className="dialog test-dialog" role="dialog" aria-modal="true" aria-label={seed ? "Rerun test" : "New test"}>
    <div className="dialog-title"><div><p className="eyebrow">{seed ? "Rerun" : "New test"}</p><h2>{steps[step]}</h2></div><button className="icon-button" onClick={close} aria-label="Close"><X size={17} /></button></div>
    <ol className="stepper">{steps.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "done" : ""}><span>{index < step ? <Check size={11} weight="bold" /> : index + 1}</span><b>{label}</b></li>)}</ol>
    <div className="dialog-content">
      {step === 0 && <TypeStep value={testType} onChange={chooseType} />}
      {step === 1 && <ContentStep testType={testType} title={title} setTitle={setTitle} options={options} setOptions={setOptions} updateOption={updateOption} selectTextOption={selectTextOption} addOption={addOption} removeOption={removeOption} upload={upload} busy={busy} />}
      {step === 2 && <AudienceStep audience={audience} setAudience={setAudience} saved={savedAudiences ?? []} selectedId={selectedAudienceId} setSelectedId={setSelectedAudienceId} saveName={saveName} setSaveName={setSaveName} save={storeAudience} remove={deleteAudience} busy={busy} />}
      {step === 3 && <PanelStep pricing={pricing} panelIndex={panelIndex} setPanelIndex={setPanelIndex} locked={Boolean(seed && reusePanel)} />}
      {step === 4 && <ReviewStep testType={testType} title={title} options={options} audience={audience} quote={quote} balanceCents={balanceCents} seed={seed} reusePanel={reusePanel} setReusePanel={(value: boolean) => { setReusePanel(value); if (value && seed) setPanelIndex(initialIndex); }} />}
    </div>
    {error && <p className="form-error dialog-error" role="alert">{error}</p>}
    <div className="dialog-footer"><button className="button ghost" disabled={step === 0 || busy} onClick={() => { setError(""); setStep((value) => value - 1); }}><ArrowLeft size={15} /> Back</button>{step < 4 ? <button className="button primary" disabled={!valid || busy} onClick={() => { setError(""); setStep((value) => value + 1); }}>Continue <ArrowRight size={15} /></button> : <button className="button primary" disabled={busy} onClick={submit}>{busy ? "Launching…" : `Launch for ${money(quote.priceCents)}`} <ArrowRight size={15} /></button>}</div>
  </section></div>;
}

function makeOption(label: string): OptionDraft { return { key: crypto.randomUUID(), label: `Option ${label}`, optionType: "text", text: "" }; }

function TypeStep({ value, onChange }: { value: "compare" | "question"; onChange(value: "compare" | "question"): void }) {
  return <div className="type-grid"><button className={value === "compare" ? "type-card selected" : "type-card"} onClick={() => onChange("compare")}><TextT size={22} /><strong>Compare</strong><span>Test 2 to 5 pieces of text or creative. Each respondent sees a randomized order.</span></button><button className={value === "question" ? "type-card selected" : "type-card"} onClick={() => onChange("question")}><ImageIcon size={22} /><strong>Ask a question</strong><span>Collect open-ended answers from every respondent in the panel.</span></button></div>;
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
  return <div className="form-stack"><label className="field"><span>{testType === "compare" ? "Header question" : "Question"}</span><textarea rows={2} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={testType === "compare" ? "Which option makes you most likely to buy?" : "What would make you switch from your current product?"} /><small>{title.length}/300</small></label>
    {testType === "question" && options.length === 0 && <button className="button secondary align-left" onClick={() => setOptions([makeOption("context")])}><Plus size={15} /> Add supporting text or image</button>}
    {options.map((option: OptionDraft, index: number) => <div className="option-editor" key={option.key}><div className="option-head"><input value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} aria-label={`Option ${index + 1} label`} />{testType === "compare" && options.length > 2 && <button className="icon-button" onClick={() => removeOption(index)} aria-label="Remove option"><Trash size={15} /></button>}{testType === "question" && <button className="icon-button" onClick={() => removeOption(index)} aria-label="Remove context"><Trash size={15} /></button>}</div><div className="content-kind"><button className={option.optionType === "text" ? "active" : ""} onClick={() => selectTextOption(index)}><TextT size={14} /> Text</button><label className={option.optionType === "image" ? "active" : ""}><UploadSimple size={14} /> Image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => upload(index, event.target.files?.[0])} /></label></div>{option.optionType === "text" ? <textarea rows={4} value={option.text} onChange={(event) => updateOption(index, { text: event.target.value })} placeholder="Paste the copy or concept to test" /> : <div className={option.assetId ? "upload-zone uploaded" : "upload-zone"}><ImageIcon size={20} /><span>{option.fileName ?? "Choose a PNG, JPEG, or WebP image"}</span><small>8 MB maximum</small></div>}</div>)}
    {testType === "compare" && options.length < 5 && <button className="button secondary align-left" onClick={addOption}><Plus size={15} /> Add option</button>}
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
  return <div className="form-stack">{saved.length > 0 && <div className="saved-audience-picker"><label className="field"><span>Saved audience</span><select value={selectedId} onChange={(event) => { const nextId = event.target.value as Id<"savedAudiences"> | ""; setSelectedId(nextId); const match = saved.find((item) => item._id === nextId); if (match) setAudience(match.criteria); }}><option value="">Choose saved criteria</option>{saved.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><button className="button secondary" disabled={!selectedId || busy} onClick={remove}><Trash size={14} /> Remove</button></div>}
    <label className="field"><span>Target locations</span><input value={audience.locations.join(", ")} onChange={(event) => setAudience({ ...audience, locations: event.target.value.split(",").map((item: string) => item.trim()).filter(Boolean) })} placeholder="United States, Canada" /><small>Separate locations with commas.</small></label>
    <label className="field"><span>Persona description</span><textarea rows={3} value={audience.description} onChange={(event) => setAudience({ ...audience, description: event.target.value })} placeholder="Amazon buyers interested in home coffee equipment who compare reviews before buying" /></label>
    <div className="range-field"><div><span>Gender mix</span><b>{genderLabels[genderIndex]}</b></div><input type="range" aria-label="Gender mix" aria-valuetext={genderLabels[genderIndex]} min="0" max="2" step="1" value={genderIndex} onChange={(event) => setAudience({ ...audience, gender: genderValues[Number(event.target.value)] })} /><div className="range-labels"><span>Female</span><span>Mixed</span><span>Male</span></div></div>
    <div className="range-field age-field"><div><span>Age range</span><b>{audience.minAge}–{audience.maxAge}</b></div><div className="dual-range"><input type="range" aria-label="Minimum age" min="18" max="80" value={audience.minAge} onChange={(event) => setAudience({ ...audience, minAge: Math.min(Number(event.target.value), audience.maxAge - 1) })} /><input type="range" aria-label="Maximum age" min="18" max="80" value={audience.maxAge} onChange={(event) => setAudience({ ...audience, maxAge: Math.max(Number(event.target.value), audience.minAge + 1) })} /></div><div className="range-labels"><span>18</span><span>80</span></div></div>
    <div className="save-audience"><input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Name this audience" /><button className="button secondary" onClick={save}>Save audience</button></div>
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
  return <div className="panel-step"><div className="panel-quote"><span>{selected.size} respondents</span><strong>{money(selected.priceCents)}</strong><small>{locked ? "Same-panel reruns keep the original panel size" : selected.discountPercent ? `${selected.discountPercent}% volume discount` : "$0.25 per response"}</small></div><input className="panel-slider" type="range" aria-label="Panel size" aria-valuetext={`${selected.size} respondents`} min="0" max={pricing.panels.length - 1} step="1" value={panelIndex} disabled={locked} onChange={(event) => setPanelIndex(Number(event.target.value))} /><div className="panel-stops">{pricing.panels.map((item, index) => <button key={item.size} disabled={locked && index !== panelIndex} className={index === panelIndex ? "active" : ""} onClick={() => setPanelIndex(index)}><b>{item.size}</b><span>{money(item.priceCents)}</span><small>{item.discountPercent ? `−${item.discountPercent}%` : "Base"}</small></button>)}</div><p className="quiet-callout">Plurena assigns several model families across the panel. Image tests use vision-capable models only.</p></div>;
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
  return <div className="review-grid">{seed && <div className="review-block wide"><span>Panel</span><div className="rerun-choice"><button className={!reusePanel ? "selected" : ""} onClick={() => setReusePanel(false)}><strong>Fresh panel</strong><small>Generate new matching personas</small></button><button className={reusePanel ? "selected" : ""} onClick={() => setReusePanel(true)}><strong>Same panel</strong><small>Reuse the original personas</small></button></div></div>}<div className="review-block"><span>Type</span><strong>{testType === "compare" ? "Comparison" : "Open question"}</strong></div><div className="review-block"><span>Panel</span><strong>{quote.size} respondents</strong></div><div className="review-block wide"><span>Question</span><strong>{title}</strong></div>{options.length > 0 && <div className="review-block wide"><span>Content</span><strong>{options.length} {options.length === 1 ? "item" : "options"}</strong><small>{options.map((item: OptionDraft) => `${item.label} · ${item.optionType}`).join(" / ")}</small></div>}<div className="review-block wide"><span>Audience</span><strong>{audience.description}</strong><small>{audience.locations.join(", ")} · {audience.minAge}–{audience.maxAge} · {audience.gender}</small></div><div className="cost-summary wide"><div><span>Balance</span><strong>{money(balanceCents)}</strong></div><div><span>Final cost</span><strong>{money(quote.priceCents)}</strong></div><div className={balanceCents < quote.priceCents ? "remaining negative" : "remaining"}><span>After launch</span><strong>{money(balanceCents - quote.priceCents)}</strong></div></div>{balanceCents < quote.priceCents && <p className="insufficient wide" role="status">Insufficient credit. Close this dialog and add balance from the header.</p>}<p className="quiet-callout wide">Plurena securely processes your study material and generated persona context to produce panel responses.</p></div>;
}

function validateStep(step: number, type: string, title: string, options: OptionDraft[], audience: Audience) {
  if (step === 0) return Boolean(type);
  if (step === 1) return title.trim().length >= 4 && (type === "question" ? options.every(validOption) : options.length >= 2 && options.every(validOption));
  if (step === 2) return audience.locations.length > 0 && audience.description.trim().length >= 4 && audience.minAge < audience.maxAge;
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
