"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Check, Gift } from "@phosphor-icons/react";
import { useDialogA11y } from "@/lib/use-dialog-a11y";

const goals = [
  ["validate-ideas", "Validate ideas before investing"],
  ["compare-creative", "Compare copy or creative"],
  ["improve-messaging", "Improve product messaging"],
  ["explore-needs", "Explore customer needs"],
];
const plans = [
  ["manual", "Run studies in the dashboard"],
  ["api", "Use an API later"],
  ["product-workflow", "Connect results to a product workflow"],
  ["not-sure", "I am not sure yet"],
];

export function OnboardingDialog() {
  const dialogRef = useDialogA11y();
  const complete = useMutation(api.users.completeOnboarding);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toggle = (value: string, set: Dispatch<SetStateAction<string[]>>) => set((current) =>
    current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
  );
  const submit = async () => {
    if (!selectedGoals.length || !selectedPlans.length) { setError("Choose at least one answer for each question."); return; }
    setBusy(true); setError("");
    try { await complete({ goals: selectedGoals, integrationPlans: selectedPlans }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your answers."); setBusy(false); }
  };
  return <div className="dialog-backdrop onboarding-backdrop"><section ref={dialogRef} className="dialog onboarding-dialog" role="dialog" aria-modal="true" aria-label="Claim onboarding credit">
    <div className="gift-mark"><Gift size={20} weight="fill" /></div><p className="eyebrow">$6 welcome credit</p><h2>Tell us how you plan to use Plurena.</h2><p className="muted">Answer both questions to claim enough credit for your first 20-person test.</p>
    <Question title="What are you hoping to do?" items={goals} selected={selectedGoals} onToggle={(value) => toggle(value, setSelectedGoals)} />
    <Question title="How do you expect to use the results?" items={plans} selected={selectedPlans} onToggle={(value) => toggle(value, setSelectedPlans)} />
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Claim $6 credit"}</button>
    <p className="fine-print">Plurena awards this credit once per account.</p>
  </section></div>;
}

function Question({ title, items, selected, onToggle }: { title: string; items: string[][]; selected: string[]; onToggle(value: string): void }) {
  return <fieldset className="onboarding-question"><legend>{title}</legend>{items.map(([value, label]) => <label key={value} className={selected.includes(value) ? "check-option checked" : "check-option"}><input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} /><span className="fake-check">{selected.includes(value) && <Check size={12} weight="bold" />}</span><span>{label}</span></label>)}</fieldset>;
}
