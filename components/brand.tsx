import { CirclesFour } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <span className={cn("brand", className)}><span className="brand-mark"><CirclesFour size={17} weight="fill" /></span>{compact ? null : <span>Plurena</span>}</span>;
}
