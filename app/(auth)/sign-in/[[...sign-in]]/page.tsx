import { SignIn } from "@clerk/nextjs";
import { CheckCircle, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Brand } from "@/components/brand";

export default function SignInPage() {
  return <main className="auth-page">
    <div className="auth-header"><Link href="/"><Brand /></Link></div>
    <div className="auth-shell">
      <div>
        <p className="eyebrow">Welcome to Plurena</p>
        <h1>Research without the wait.</h1>
        <p className="muted">Sign in with Google to build a focused panel, launch a study, and keep every result in one calm workspace.</p>
        <div className="auth-benefits"><span><CheckCircle weight="fill" /> $6 welcome credit</span><span><ShieldCheck weight="fill" /> No subscription required</span></div>
      </div>
      <SignIn appearance={{ elements: {
        rootBox: "w-full max-w-sm",
        cardBox: "w-full shadow-none",
        card: "rounded-2xl border border-border bg-card shadow-[0_24px_70px_rgba(15,23,42,0.12)]",
        headerTitle: "font-[var(--font-display)] tracking-[-0.03em]",
        headerSubtitle: "text-muted-foreground",
        socialButtonsBlockButton: "h-11 rounded-lg border-input shadow-xs",
        formButtonPrimary: "h-11 rounded-lg bg-primary font-semibold shadow-sm hover:bg-primary/90",
        footerActionLink: "text-primary hover:text-primary/90",
      } }} />
    </div>
  </main>;
}
