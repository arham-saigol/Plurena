"use client";
import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react";
export default function TestError({ reset }: { reset(): void }) { return <main className="center-page"><div className="setup-card"><WarningCircle size={24} /><h1>Results unavailable</h1><p className="muted">This test does not exist, you do not have access, or the result service is unavailable.</p><div className="button-row"><Link className="button ghost" href="/dashboard">Dashboard</Link><button className="button secondary" onClick={reset}>Try again</button></div></div></main>; }
