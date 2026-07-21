import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "bg-accent ring-foreground/[0.04] h-1.5 w-full overflow-hidden rounded-full ring-1",
        className,
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-[var(--blue)] transition-transform duration-700"
        style={{
          transform: `translateX(-${100 - Math.max(0, Math.min(100, value ?? 0))}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}
