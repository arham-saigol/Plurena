import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-accent relative overflow-hidden rounded-lg after:absolute after:inset-0 after:animate-[shimmer_1.7s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent dark:after:via-white/5",
        className,
      )}
      {...props}
    />
  );
}
