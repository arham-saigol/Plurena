"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { CaretDown, Gear, Moon, Plus, SignOut, Sun, Wallet, X } from "@phosphor-icons/react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { money, timeAgo } from "@/lib/format";
import { useDialogA11y } from "@/lib/use-dialog-a11y";

export function AppHeader() {
  const { user } = useUser();
  const clerk = useClerk();
  const me = useQuery(api.users.me, {});
  const ensure = useMutation(api.users.ensureCurrent);
  const [menu, setMenu] = useState(false);
  const [billing, setBilling] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const initializedUserId = useRef<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
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
    const closeOnPointer = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenu(false); avatarRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("plurena-theme", next);
  };

  return <>
    <header className="app-header"><Link href="/dashboard"><Brand /></Link><div className="header-actions">
      <button className="balance-button" onClick={() => setBilling(true)}><Wallet size={15} />{me ? money(me.balanceCents) : "…"}</button>
      <div className="account-wrap" ref={accountRef}><button ref={avatarRef} className="avatar-button" onClick={() => setMenu((value) => !value)} aria-label="Account actions" aria-expanded={menu} aria-controls="account-actions"><img src={user?.imageUrl ?? ""} alt="" /><CaretDown size={12} /></button>{menu && <div className="account-menu" id="account-actions" role="group" aria-label="Account actions">
        <div className="menu-identity"><strong>{user?.fullName ?? "Your account"}</strong><span>{user?.primaryEmailAddress?.emailAddress}</span></div>
        <button onClick={() => { clerk.openUserProfile(); setMenu(false); }}><Gear size={16} /> Settings</button>
        <button onClick={toggleTheme}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Light mode" : "Dark mode"}</button>
        <button onClick={() => clerk.signOut({ redirectUrl: "/" })}><SignOut size={16} /> Sign out</button>
      </div>}</div>
    </div></header>
    {billing && <BillingDialog balanceCents={me?.balanceCents ?? 0} onClose={() => setBilling(false)} />}
  </>;
}

function BillingDialog({ balanceCents, onClose }: { balanceCents: number; onClose(): void }) {
  const dialogRef = useDialogA11y(onClose);
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
  return <div className="dialog-backdrop" role="presentation"><section ref={dialogRef} className="dialog billing-dialog" role="dialog" aria-modal="true" aria-label="Billing details">
    <div className="dialog-title"><div><p className="eyebrow">Billing</p><h2>{money(balanceCents)} available</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button></div>
    <div className="topup-section"><h3>Add balance</h3><p className="muted">One-time payment through Creem. No subscription.</p><div className="amount-options">{[1_000,2_000,5_000,10_000].map((amount) => <button key={amount} className={selected === amount ? "selected" : ""} onClick={() => setSelected(amount)}>{money(amount)}</button>)}</div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy} onClick={addBalance}><Plus size={16} /> {busy ? "Opening checkout…" : `Add ${money(selected)}`}</button></div>
    <div className="ledger"><h3>Recent activity</h3>{ledger === undefined ? <div className="skeleton-row" /> : ledger.length === 0 ? <p className="muted">No credit activity yet.</p> : ledger.map((entry: any) => <div className="ledger-row" key={entry._id}><div><strong>{ledgerLabel(entry.kind)}</strong><span>{timeAgo(entry.createdAt, renderedAt)}</span></div><b className={entry.amountCents > 0 ? "positive" : ""}>{entry.amountCents > 0 ? "+" : ""}{money(entry.amountCents)}</b></div>)}</div>
  </section></div>;
}

function ledgerLabel(kind: string) {
  return ({ onboarding_bonus: "Onboarding bonus", top_up: "Balance added", test_charge: "Panel launched", test_refund: "Panel refund" } as Record<string, string>)[kind] ?? "Credit update";
}
