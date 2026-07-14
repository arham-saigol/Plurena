"use client";
import { WarningCircle } from "@phosphor-icons/react";
export default function DashboardError({ reset }: { reset(): void }) { return <main className="center-page"><div className="setup-card"><WarningCircle size={24} /><h1>Dashboard unavailable</h1><p className="muted">We could not load your tests. Your data was not changed.</p><button className="button secondary" onClick={reset}>Try again</button></div></main>; }
