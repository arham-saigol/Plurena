import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      <section className="auth-aside relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <Brand className="relative text-[var(--aside-text)]" />
        <div className="relative max-w-md">
          <p className="text-xs font-bold tracking-[0.1em] text-[#63c398] uppercase">
            From debate to direction
          </p>
          <h1 className="mt-4 text-[2.75rem] leading-[1.06] font-bold tracking-[-0.04em] text-balance">
            Bring the audience into the decision.
          </h1>
          <ul className="mt-9 space-y-4">
            {[
              "Compare copy, positioning, and creative side by side",
              "A varied panel shaped around your real audience",
              "Decision-ready reports with evidence you can inspect",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-[var(--aside-muted)]"
              >
                <CheckCircle2 className="size-4 shrink-0 text-[#63c398]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs leading-5 text-[var(--aside-faint)]">
          Directional synthetic research is a fast input to judgment — not a
          replacement for real customer evidence.
        </p>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Brand className="lg:hidden" />
          <div className="flex items-center gap-1 lg:ml-auto">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft /> Back to the site
              </Link>
            </Button>
          </div>
        </header>
        <div className="grid flex-1 place-items-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
