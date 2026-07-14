import { SetupRequired } from "@/components/setup-required";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <SetupRequired />;
  return <>{children}</>;
}
