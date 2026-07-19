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
        "inline-flex items-center gap-2 rounded-md font-semibold tracking-[-0.02em]",
        className,
      )}
    >
      <span
        className="bg-foreground grid size-7 grid-cols-2 gap-[2px] rounded-[7px] p-[5px]"
        aria-hidden
      >
        <span className="bg-background rounded-[2px]" />
        <span className="bg-background rounded-full" />
        <span className="bg-background rounded-full" />
        <span className="bg-background rounded-[2px]" />
      </span>
      {!compact && <span className="text-[17px]">Plurena</span>}
    </Link>
  );
}
