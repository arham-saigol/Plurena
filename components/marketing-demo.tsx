"use client";

import { CheckCircle2, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = ["Decision", "Audience", "Respondents"] as const;

const optionResults = [
  { label: "B · Lead with the outcome", score: 63 },
  { label: "A · Lead with the process", score: 24 },
  { label: "C · Lead with urgency", score: 13 },
];

export function MarketingDemo() {
  const [active, setActive] = useState<(typeof tabs)[number]>("Decision");

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-[0_24px_90px_rgba(54,42,33,0.12)]">
      <div className="flex h-12 items-center justify-between border-b border-black/[0.07] bg-[#f8f6f3] px-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#f1a18a]" />
            <span className="size-2.5 rounded-full bg-[#eccf76]" />
            <span className="size-2.5 rounded-full bg-[#87cda3]" />
          </span>
          <span className="hidden text-xs font-medium text-black/45 sm:inline">
            Spring campaign · Results
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e9f5ef] px-2 py-1 text-[11px] font-semibold text-[#237a57]">
          <span className="size-1.5 rounded-full bg-[#2ba16e]" /> Decision ready
        </span>
      </div>

      <div className="border-b border-black/[0.07] px-4 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.09em] text-[#e16540] uppercase">
              Hero message test
            </p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.025em] sm:text-xl">
              Which promise earns the next click?
            </h3>
          </div>
          <span className="hidden text-xs text-black/40 sm:block">
            100 responses
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border border-black/[0.07] sm:grid-cols-4 sm:divide-y-0">
          {[
            ["Leader", "Option B"],
            ["Preference", "63%"],
            ["High confidence", "71"],
            ["Segments aligned", "4 / 5"],
          ].map(([label, value]) => (
            <div key={label} className="px-3 py-3.5 sm:px-4">
              <p className="text-[10px] font-medium text-black/42">{label}</p>
              <p className="mt-0.5 text-lg font-bold tracking-[-0.03em]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active === tab}
              onClick={() => setActive(tab)}
              className={cn(
                "relative shrink-0 px-3 pb-3 text-xs font-semibold text-black/42 transition hover:text-black",
                active === tab &&
                  "text-black after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#e16540]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[330px] p-4 sm:p-6">
        {active === "Decision" && <DecisionView />}
        {active === "Audience" && <AudienceView />}
        {active === "Respondents" && <RespondentsView />}
      </div>
    </div>
  );
}

function DecisionView() {
  return (
    <div className="animate-enter grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-black/[0.07] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e9f5ef] text-[#237a57]">
            <CheckCircle2 className="size-4.5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-[#237a57] uppercase">
              Clear direction
            </p>
            <p className="mt-1 font-bold">Lead with the outcome</p>
            <p className="mt-1 text-xs leading-5 text-black/50">
              It makes the value concrete before asking people to understand the
              product.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {optionResults.map((option, index) => (
            <div key={option.label}>
              <div className="mb-1.5 flex justify-between gap-3 text-xs">
                <span className="truncate font-medium">{option.label}</span>
                <span className="font-bold">{option.score}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/[0.055]">
                <div
                  className={cn(
                    "h-full rounded-full",
                    index === 0 ? "bg-[#006fd6]" : "bg-black/20",
                  )}
                  style={{ width: `${option.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {[
          [
            "Why it won",
            "Specific, immediate value reduced the mental work needed to understand the offer.",
          ],
          [
            "Watch-out",
            "Newer buyers still wanted one short line explaining how the result is achieved.",
          ],
          [
            "Next move",
            "Keep the outcome-led headline and test a more concrete supporting proof point.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl bg-[#f6f4f1] p-4">
            <p className="text-[10px] font-semibold tracking-wide text-black/42 uppercase">
              {title}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-black/66">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AudienceView() {
  return (
    <div className="animate-enter grid gap-4 sm:grid-cols-3">
      {[
        {
          name: "Hands-on operators",
          share: "42 people",
          body: "Chose specificity and a promise they could verify quickly.",
          signal: "72% chose B",
        },
        {
          name: "Team leads",
          share: "35 people",
          body: "Preferred business impact, but looked for proof and risk reduction.",
          signal: "60% chose B",
        },
        {
          name: "Category newcomers",
          share: "23 people",
          body: "Needed context before the outcome felt credible or relevant.",
          signal: "43% chose B",
        },
      ].map((segment, index) => (
        <div
          key={segment.name}
          className="rounded-xl border border-black/[0.07] p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-[#f3eee9] text-xs font-bold">
              {index + 1}
            </span>
            <span className="text-[10px] text-black/38">{segment.share}</span>
          </div>
          <p className="mt-5 text-sm font-bold">{segment.name}</p>
          <p className="mt-2 text-xs leading-5 text-black/52">{segment.body}</p>
          <p className="mt-4 text-xs font-semibold text-[#006fd6]">
            {segment.signal}
          </p>
        </div>
      ))}
    </div>
  );
}

function RespondentsView() {
  return (
    <div className="animate-enter overflow-hidden rounded-xl border border-black/[0.07]">
      {[
        [
          "Maya",
          "Demand gen lead",
          "B",
          "Clear value without marketing fog",
          "High",
        ],
        [
          "Theo",
          "Founder-led growth",
          "B",
          "Tells me what improves before how",
          "High",
        ],
        [
          "Nadia",
          "First-time buyer",
          "A",
          "The process made the claim feel safer",
          "Medium",
        ],
        [
          "Leon",
          "Lifecycle marketer",
          "B",
          "Specific enough to earn a closer look",
          "High",
        ],
      ].map(([name, role, choice, reason, confidence], index) => (
        <div
          key={name}
          className="grid gap-3 border-b px-4 py-3.5 last:border-b-0 sm:grid-cols-[1fr_52px_1.5fr_72px] sm:items-center"
        >
          <div className="flex items-center gap-3">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold"
              style={{
                background: ["#f7d1c5", "#cce7f7", "#e1d7f5", "#d1eadb"][index],
              }}
            >
              {name[0]}
            </span>
            <div>
              <p className="text-xs font-bold">{name}</p>
              <p className="text-[10px] text-black/42">{role}</p>
            </div>
          </div>
          <span className="w-fit rounded-md bg-[#eaf3fc] px-2 py-1 text-[11px] font-bold text-[#006fd6]">
            {choice}
          </span>
          <p className="text-xs text-black/60">“{reason}”</p>
          <span className="text-[10px] font-semibold text-[#237a57]">
            {confidence}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 bg-[#f8f6f3] py-3 text-[11px] font-medium text-black/45">
        <Users className="size-3.5" /> Open any response for the full
        perspective
      </div>
    </div>
  );
}
