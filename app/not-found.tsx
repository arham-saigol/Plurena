import Link from "next/link";
export default function NotFound() { return <main className="center-page"><div className="setup-card"><p className="eyebrow">404</p><h1>Page not found</h1><p className="muted">The page may have moved or you may not have access.</p><Link className="button secondary" href="/dashboard">Return to dashboard</Link></div></main>; }
