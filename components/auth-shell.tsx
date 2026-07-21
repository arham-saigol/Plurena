import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/brand";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="marketing bg-background grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden overflow-hidden bg-[#201f1d] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="fine-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
        <Brand className="relative text-white" />
        <div className="relative max-w-lg">
          <p className="text-xs font-bold tracking-[0.1em] text-[#ef805e] uppercase">
            From debate to direction
          </p>
          <h1 className="mt-4 text-5xl leading-[1.02] font-extrabold tracking-[-0.06em] text-balance">
            Make the audience part of the decision.
          </h1>
          <div className="mt-9 space-y-4">
            {[
              "Compare text and visual concepts",
              "Build a varied panel around your real audience",
              "Start with the finding, then inspect the evidence",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-sm text-white/65"
              >
                <CheckCircle2 className="size-4 text-[#ef805e]" /> {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs leading-5 text-white/35">
          Directional synthetic research is a fast input to judgment, not a
          replacement for real customer evidence.
        </p>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8 lg:justify-end">
          <Brand className="lg:hidden" />
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition"
          >
            <ArrowLeft className="size-3.5" /> Back to the site
          </Link>
        </header>
        <div className="grid flex-1 place-items-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
