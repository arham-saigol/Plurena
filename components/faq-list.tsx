"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Faq = {
  question: string;
  answer: string;
};

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <FaqItem key={item.question} {...item} />
      ))}
    </div>
  );
}

function FaqItem({ question, answer }: Faq) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const questionId = `${id}-question`;
  const answerId = `${id}-answer`;

  return (
    <div className="bg-card rounded-2xl border shadow-[var(--shadow-sm)]">
      <button
        id={questionId}
        type="button"
        aria-expanded={open}
        aria-controls={answerId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-6 px-5 py-5 text-left font-semibold tracking-[-0.02em] sm:px-6"
      >
        {question}
        <span
          aria-hidden="true"
          className="text-muted-foreground relative size-5 shrink-0"
        >
          <span className="absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-current" />
          <span
            className={cn(
              "absolute top-1/2 left-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-current transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "scale-y-0",
            )}
          />
        </span>
      </button>
      <div
        id={answerId}
        role="region"
        aria-labelledby={questionId}
        aria-hidden={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p
            className={cn(
              "text-muted-foreground max-w-2xl px-5 pb-5 text-[15px] leading-7 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:px-6 sm:pr-16 sm:pb-6",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
          >
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
