"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  CircleDollarSign,
  FlaskConical,
  LayoutDashboard,
  Moon,
  Plus,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMoney } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/tests", label: "Tests", icon: FlaskConical },
  { href: "/app/billing", label: "Balance", icon: CircleDollarSign },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function WorkspaceBootstrap({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const sync = useMutation(api.users.syncCurrentUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || ready) return;
    void sync({
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? undefined,
      imageUrl: user.imageUrl,
    })
      .then(() => setReady(true))
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not initialize workspace",
        );
      });
  }, [isLoaded, ready, sync, user]);

  if (!ready) {
    return (
      <div className="bg-background grid min-h-screen place-items-center">
        <div className="w-64 space-y-3">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    );
  }
  return children;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!mounted) return <span className="size-8" />;
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentUser = useQuery(api.users.current);

  return (
    <div className="bg-background min-h-screen">
      <aside className="bg-sidebar fixed inset-y-0 left-0 z-20 hidden w-[270px] flex-col border-r p-2 md:flex">
        <div className="flex h-11 items-center justify-between px-2">
          <Brand href="/app" />
          <ThemeToggle />
        </div>
        <Button asChild variant="blue" className="mt-2 justify-start">
          <Link href="/app/tests/new">
            <Plus /> New test
          </Link>
        </Button>
        <nav className="mt-4 space-y-0.5" aria-label="Workspace navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/app" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-muted-foreground hover:text-foreground flex h-8 items-center gap-2 rounded-md px-2.5 text-sm transition hover:bg-[var(--sidebar-hover)]",
                  active &&
                    "text-foreground bg-[var(--sidebar-hover)] font-medium",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 px-2.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide">
            AVAILABLE BALANCE
          </p>
          <p className="mt-1 text-lg font-semibold">
            {currentUser ? formatMoney(currentUser.balanceCents) : "—"}
          </p>
          <Link
            href="/app/billing"
            className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--blue)] hover:underline"
          >
            Add funds
          </Link>
        </div>
        <div className="mt-auto flex items-center justify-between rounded-md px-2 py-2 hover:bg-[var(--sidebar-hover)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {currentUser?.name ?? "Workspace"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {currentUser?.email}
            </p>
          </div>
          <UserButton />
        </div>
      </aside>

      <header className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Brand href="/app" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-2"
          aria-label="Mobile workspace navigation"
        >
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/app" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-muted-foreground inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
                  active && "bg-accent text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="md:pl-[270px]">
        <main className="mx-auto min-h-screen max-w-[1200px] p-4 sm:p-7 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="grid min-h-screen place-items-center">
          <Skeleton className="h-8 w-52" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="grid min-h-screen place-items-center p-6">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Your session has expired.
            </p>
            <Button asChild className="mt-4">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <WorkspaceBootstrap>
          <Shell>{children}</Shell>
        </WorkspaceBootstrap>
      </Authenticated>
    </>
  );
}
