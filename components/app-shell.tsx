"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  Coins,
  FlaskConical,
  LayoutDashboard,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Brand } from "@/components/brand";
import { ProfileMenu } from "@/components/profile-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCredits } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/tests", label: "Tests", icon: FlaskConical },
];

const mobileNavItems = [
  ...navItems,
  { href: "/app/tests/new", label: "New", icon: Plus },
  { href: "/app/billing", label: "Credits", icon: Coins },
];

function WorkspaceBootstrap({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const sync = useMutation(api.users.syncCurrentUser);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string>();

  useEffect(() => {
    if (!isLoaded || !user || ready || syncError) return;
    void sync({
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? undefined,
      imageUrl: user.imageUrl,
    })
      .then(() => setReady(true))
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : "Could not initialize workspace";
        setSyncError(message);
        toast.error(message);
      });
  }, [isLoaded, ready, sync, syncError, user]);

  if (syncError) {
    return (
      <div className="bg-background grid min-h-screen place-items-center p-6">
        <div className="bg-card max-w-sm rounded-2xl border p-8 text-center shadow-[var(--shadow-sm)]">
          <p className="text-destructive text-sm font-medium">
            Could not initialize workspace
          </p>
          <p className="text-muted-foreground mt-2 text-sm">{syncError}</p>
          <Button className="mt-4" onClick={() => setSyncError(undefined)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="bg-background grid min-h-screen place-items-center">
        <div className="w-72 space-y-4 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[var(--green-soft)]">
            <Sparkles className="size-5 text-[var(--green)]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="mx-auto h-4 w-36" />
            <Skeleton className="mx-auto h-3 w-52" />
          </div>
        </div>
      </div>
    );
  }
  return children;
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentUser = useQuery(api.users.current);

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur-xl">
        <div className="mx-auto hidden h-16 max-w-[84rem] grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 lg:grid lg:px-10">
          <Brand href="/app" />
          <nav
            className="bg-card flex items-center rounded-lg border p-1"
            aria-label="Workspace navigation"
          >
            {navItems.map(({ href, label }) => {
              const active =
                href === "/app" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "text-muted-foreground rounded-md px-3.5 py-1.5 text-sm font-medium transition",
                    active &&
                      "bg-accent text-foreground shadow-[var(--shadow-sm)]",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-end gap-1.5">
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/app/billing">
                <Coins />
                {currentUser ? formatCredits(currentUser.creditBalance) : "—"}
              </Link>
            </Button>
            <div className="ml-1 grid size-10 place-items-center">
              <ProfileMenu />
            </div>
          </div>
        </div>

        <div className="flex h-15 items-center justify-between px-4 lg:hidden">
          <Brand href="/app" />
          <div className="flex items-center gap-1">
            <div className="ml-1 grid size-9 place-items-center">
              <ProfileMenu />
            </div>
          </div>
        </div>
      </header>

      <nav
        className="bg-background/90 fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
        aria-label="Mobile workspace navigation"
      >
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/app"
              ? pathname === href
              : href === "/app/tests"
                ? pathname.startsWith(href) &&
                  !pathname.startsWith("/app/tests/new")
                : pathname.startsWith(href);
          const create = href === "/app/tests/new";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-muted-foreground flex min-h-15 flex-col items-center justify-center gap-1 text-[10px] font-medium",
                active && "text-foreground",
                create && "text-[var(--green)]",
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-lg",
                  active && !create && "bg-accent",
                  create && "bg-[var(--green-soft)]",
                )}
              >
                <Icon className="size-4" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[84rem] px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 lg:pb-12">
        {children}
      </main>
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
          <div className="bg-card rounded-2xl border p-8 text-center shadow-[var(--shadow-sm)]">
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
