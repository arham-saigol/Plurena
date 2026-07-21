import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_1px_rgba(0,0,0,0.06),0_8px_18px_-12px_rgba(0,0,0,0.55)] hover:opacity-90",
        secondary: "bg-accent text-accent-foreground hover:bg-muted",
        outline:
          "border bg-background shadow-[var(--shadow-sm)] hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-[var(--destructive-strong)] text-white hover:opacity-90",
        accent:
          "bg-[var(--cta)] text-[var(--cta-foreground)] shadow-[0_1px_1px_rgba(0,0,0,0.06),0_8px_18px_-10px_color-mix(in_srgb,var(--cta)_65%,transparent)] hover:bg-[var(--cta-hover)]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
