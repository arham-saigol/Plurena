"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import * as Avatar from "@radix-ui/react-avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function ProfileMenu() {
  const { openUserProfile, signOut } = useClerk();
  const { user } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  const initials =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((name) => name?.[0])
      .join("") ||
    user?.primaryEmailAddress?.emailAddress[0]?.toUpperCase() ||
    "P";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="Open profile menu"
      >
        <Avatar.Root className="bg-muted grid size-8 place-items-center overflow-hidden rounded-full">
          <Avatar.Image
            className="size-full object-cover"
            src={user?.imageUrl}
            alt=""
          />
          <Avatar.Fallback className="text-xs font-semibold" delayMs={200}>
            {initials}
          </Avatar.Fallback>
        </Avatar.Root>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="bg-card z-50 w-60 rounded-xl border p-1.5 shadow-[var(--shadow-lift)]"
        >
          <DropdownMenu.Label className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">
              {user?.fullName ?? "Your account"}
            </p>
            <p className="text-muted-foreground truncate text-xs font-normal">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="bg-border my-1 h-px" />
          <DropdownMenu.Item
            className="focus:bg-accent flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none"
            onSelect={() => setTheme(dark ? "light" : "dark")}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Switch to {dark ? "light" : "dark"} mode
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="focus:bg-accent flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none"
            onSelect={() => openUserProfile({ appearance: clerkAppearance })}
          >
            <UserRound className="size-4" />
            Manage account
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="bg-border my-1 h-px" />
          <DropdownMenu.Item
            className="text-destructive focus:bg-destructive/10 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none"
            onSelect={() => void signOut({ redirectUrl: "/" })}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
