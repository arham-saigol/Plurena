import { AppShell } from "@/components/app-shell";
import { ConfigurationRequired } from "@/components/configuration-required";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL
  ) {
    return <ConfigurationRequired />;
  }
  return <AppShell>{children}</AppShell>;
}
