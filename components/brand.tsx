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
      <span className="grid size-7 place-items-center" aria-hidden>
        <svg viewBox="28 18 184 184" className="size-7">
          <circle cx="48" cy="42" r="12" fill="#73C6A1" />
          <circle cx="120" cy="42" r="12" fill="#73C6A1" />
          <circle cx="192" cy="42" r="12" fill="#73C6A1" />
          <path
            d="M48 76v12c0 20 15 27 32 33 24 9 40 28 40 55"
            fill="none"
            stroke="#1D7A56"
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path
            d="M192 76v12c0 20-15 27-32 33-24 9-40 28-40 55"
            fill="none"
            stroke="#1D7A56"
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path
            d="M120 76v100"
            fill="none"
            stroke="#1D7A56"
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path d="M120 160v24" fill="none" stroke="#1D7A56" strokeWidth="16" />
        </svg>
      </span>
      {!compact && <span className="text-[18px]">Plurena</span>}
    </Link>
  );
}
