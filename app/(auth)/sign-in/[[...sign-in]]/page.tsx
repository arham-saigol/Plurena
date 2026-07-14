import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Brand } from "@/components/brand";

export default function SignInPage() {
  return <main className="auth-page"><div className="auth-header"><Link href="/"><Brand /></Link></div><div className="auth-shell"><div><p className="eyebrow">Welcome to Plurena</p><h1>Research without the wait.</h1><p className="muted">Use your Google account to start a panel in minutes.</p></div><SignIn /></div></main>;
}
