import { CirclesFour } from "@phosphor-icons/react/dist/ssr";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-mark"><CirclesFour size={17} weight="fill" /></span>{compact ? null : <span>Plurena</span>}</span>;
}
