import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg font-bold tracking-[-0.035em]",
        className,
      )}
    >
      <span
        className="grid size-7 place-items-center rounded-lg bg-[var(--cta)] shadow-[0_4px_12px_-6px_var(--cta)]"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4.5 fill-none stroke-[var(--cta-foreground)]"
          strokeWidth="2"
        >
          <circle cx="5.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle
            cx="5.5"
            cy="17.5"
            r="1.5"
            fill="currentColor"
            stroke="none"
          />
          <path d="M8.5 6.5h1c3 0 3.5 5.5 6.5 5.5h2.5" strokeLinecap="round" />
          <path d="M8.5 12h10" strokeLinecap="round" />
          <path d="M8.5 17.5h1c3 0 3.5-5.5 6.5-5.5" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && <span className="text-[18px]">Plurena</span>}
    </Link>
  );
}
