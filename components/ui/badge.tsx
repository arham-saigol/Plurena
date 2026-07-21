import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    neutral: "bg-accent text-muted-foreground ring-1 ring-foreground/[0.05]",
    blue: "bg-[var(--blue-soft)] text-[var(--blue)] ring-1 ring-[var(--blue)]/15",
    green:
      "bg-[var(--green-soft)] text-[var(--green)] ring-1 ring-[var(--green)]/15",
    amber:
      "bg-[var(--amber-soft)] text-[var(--amber)] ring-1 ring-[var(--amber)]/15",
    red: "bg-[var(--destructive-soft)] text-[var(--destructive)] ring-1 ring-[var(--destructive)]/15",
  };
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
