"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { Gear, Moon, Plus, SignOut, Sun, Wallet } from "@phosphor-icons/react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { money, timeAgo } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { user } = useUser();
  const clerk = useClerk();
  const me = useQuery(api.users.me, {});
  const ensure = useMutation(api.users.ensureCurrent);
  const [menu, setMenu] = useState(false);
  const [billing, setBilling] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const initializedUserId = useRef<string | null>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!user || initializedUserId.current === user.id) return;
    initializedUserId.current = user.id;
    void ensure({});
  }, [ensure, user]);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!menu) return;
    const restoreFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        avatarRef.current?.focus();
      }
    };
    document.addEventListener("keydown", restoreFocus);
    return () => document.removeEventListener("keydown", restoreFocus);
  }, [menu]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("plurena-theme", next);
  };

  return <>
    <header className="app-header sticky top-0 z-30 h-[60px] bg-background/90 backdrop-blur-xl"><div className="flex h-full w-full items-center justify-between px-5 sm:px-8"><div className="flex items-center"><Link href="/dashboard" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"><Brand /></Link></div><div className="flex items-center gap-1.5">
      <Button className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground" variant="ghost" onClick={() => setBilling(true)}><Wallet size={15} /><span className="hidden sm:inline">Balance</span><span className="font-medium tabular-nums text-foreground">{me ? money(me.balanceCents) : "…"}</span></Button>
      <DropdownMenu open={menu} onOpenChange={setMenu}><DropdownMenuTrigger render={<Button ref={avatarRef} variant="ghost" className="account-trigger h-8 w-8 min-w-8 rounded-lg p-1" aria-label="Account actions" title="Account menu" />}><Avatar size="sm" className="account-avatar"><AvatarImage src={user?.imageUrl ?? ""} alt="" width={24} height={24} /><AvatarFallback>{user?.firstName?.slice(0, 1) ?? "P"}</AvatarFallback></Avatar></DropdownMenuTrigger><DropdownMenuContent align="end" className="account-menu-content w-60"><span role="group" aria-label="Account actions" className="contents">
        <DropdownMenuGroup><DropdownMenuLabel><strong className="block text-foreground">{user?.fullName ?? "Your account"}</strong><span className="block truncate font-normal">{user?.primaryEmailAddress?.emailAddress}</span></DropdownMenuLabel></DropdownMenuGroup><DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => clerk.openUserProfile()}><Gear size={16} /> Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Light mode" : "Dark mode"}</DropdownMenuItem>
        <DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => clerk.signOut({ redirectUrl: "/" })}><SignOut size={16} /> Sign out</DropdownMenuItem>
      </span></DropdownMenuContent></DropdownMenu>
    </div></div></header>
    {billing && <BillingDialog balanceCents={me?.balanceCents ?? 0} onClose={() => setBilling(false)} />}
  </>;
}

function BillingDialog({ balanceCents, onClose }: { balanceCents: number; onClose(): void }) {
  const ledger = useQuery(api.users.ledger, {});
  const [selected, setSelected] = useState(1_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const addBalance = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: selected, requestId: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error ?? "Checkout could not start.");
      location.assign(data.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not start."); setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="billing-dialog max-w-md gap-0 overflow-hidden p-0">
    <DialogHeader className="dialog-title"><p className="eyebrow">Billing</p><DialogTitle>{money(balanceCents)} available</DialogTitle><DialogDescription className="sr-only">Add balance and review recent credit activity.</DialogDescription></DialogHeader>
    <div className="topup-section"><h3>Add balance</h3><p className="muted">One-time payment through Creem. No subscription.</p><div className="amount-options">{[1_000,2_000,5_000,10_000].map((amount) => <Button key={amount} className={selected === amount ? "selected" : ""} variant={selected === amount ? "default" : "outline"} aria-pressed={selected === amount} disabled={busy} onClick={() => setSelected(amount)}>{money(amount)}</Button>)}</div>{error && <p className="form-error" role="alert">{error}</p>}<Button className="w-full" disabled={busy} onClick={addBalance}><Plus size={16} /> {busy ? "Opening checkout…" : `Add ${money(selected)}`}</Button></div>
    <div className="ledger"><h3>Recent activity</h3>{ledger === undefined ? <div className="skeleton-row" /> : ledger.length === 0 ? <p className="muted">No credit activity yet.</p> : ledger.map((entry: any) => <div className="ledger-row" key={entry._id}><div><strong>{ledgerLabel(entry.kind)}</strong><span>{timeAgo(entry.createdAt, renderedAt)}</span></div><b className={entry.amountCents > 0 ? "positive" : ""}>{entry.amountCents > 0 ? "+" : ""}{money(entry.amountCents)}</b></div>)}</div>
  </DialogContent></Dialog>;
}

function ledgerLabel(kind: string) {
  return ({ onboarding_bonus: "Onboarding bonus", top_up: "Balance added", test_charge: "Panel launched", test_refund: "Panel refund" } as Record<string, string>)[kind] ?? "Credit update";
}
