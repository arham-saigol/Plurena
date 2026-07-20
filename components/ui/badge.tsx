import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "neutral" | "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    neutral: "bg-accent text-muted-foreground",
    blue: "bg-[var(--blue-soft)] text-[var(--blue)]",
    green: "bg-[var(--green-soft)] text-[var(--green)]",
    amber: "bg-[var(--amber-soft)] text-[var(--amber)]",
    red: "bg-red-500/10 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
