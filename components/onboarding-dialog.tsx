"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Gift } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

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
    try { await complete({ goals: selectedGoals, integrationPlans: selectedPlans }); } catch (cause) {
      setError(cause instanceof Error && cause.message.includes("PROMOTION_DAILY_LIMIT_REACHED") ? "Today’s welcome-credit limit has been reached. Try again tomorrow." : "Could not save your answers.");
      setBusy(false);
    }
  };
  return <Dialog open><DialogContent className="onboarding-dialog max-w-xl" showCloseButton={false}>
    <div className="gift-mark"><Gift size={20} weight="fill" /></div><p className="eyebrow">$6 welcome credit</p><DialogTitle>Tell us how you plan to use Plurena.</DialogTitle><DialogDescription>Answer both questions to claim enough credit for your first 20-person test.</DialogDescription>
    <Question title="What are you hoping to do?" items={goals} selected={selectedGoals} onToggle={(value) => toggle(value, setSelectedGoals)} />
    <Question title="How do you expect to use the results?" items={plans} selected={selectedPlans} onToggle={(value) => toggle(value, setSelectedPlans)} />
    {error && <p className="form-error" role="alert">{error}</p>}<Button size="lg" className="w-full" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Claim $6 credit"}</Button>
    <p className="fine-print">Plurena awards this credit once per account, subject to daily availability.</p>
  </DialogContent></Dialog>;
}

function Question({ title, items, selected, onToggle }: { title: string; items: string[][]; selected: string[]; onToggle(value: string): void }) {
  return <fieldset className="onboarding-question"><legend>{title}</legend>{items.map(([value, label]) => <label key={value} className={selected.includes(value) ? "check-option checked" : "check-option"}><Checkbox checked={selected.includes(value)} onCheckedChange={() => onToggle(value)} /><span>{label}</span></label>)}</fieldset>;
}
