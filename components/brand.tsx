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
          strokeWidth="2.2"
        >
          <circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="8" r="2.2" fill="currentColor" stroke="none" />
          <path
            d="M5.5 16.5c.7-2 2.2-3 4.5-3s3.8 1 4.5 3"
            strokeLinecap="round"
          />
          <path
            d="M13.5 16.5c.45-1.35 1.5-2.2 3.2-2.5"
            strokeLinecap="round"
            opacity=".75"
          />
        </svg>
      </span>
      {!compact && <span className="text-[18px]">Plurena</span>}
    </Link>
  );
}
