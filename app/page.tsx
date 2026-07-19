import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  ImageIcon,
  MessageSquareText,
  MousePointer2,
  Quote,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

const decisions = [
  { icon: MessageSquareText, label: "Headlines & copy" },
  { icon: Target, label: "Positioning" },
  { icon: ImageIcon, label: "Visual concepts" },
  { icon: MousePointer2, label: "Landing-page heroes" },
];

const audienceFaces = ["RM", "AK", "SJ", "TL", "NV", "CD", "MP"];

export default function LandingPage() {
  return (
    <main className="marketing min-h-screen overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav
            className="hidden items-center gap-7 text-sm font-medium md:flex"
            aria-label="Main navigation"
          >
            <a href="#how-it-works" className="hover:text-black/60">
              How it works
            </a>
            <a href="#use-cases" className="hover:text-black/60">
              Use cases
            </a>
            <a href="#pricing" className="hover:text-black/60">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/sign-in">Log in</Link>
            </Button>
            <Button asChild variant="blue">
              <Link href="/sign-up">Start with $6 free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative px-5 pt-24 pb-16 sm:px-8 sm:pt-32 lg:pb-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[620px] max-w-6xl bg-[radial-gradient(circle_at_50%_20%,rgba(35,131,226,0.10),transparent_54%)]" />
        <div className="mx-auto max-w-5xl text-center">
          <div
            className="mx-auto mb-7 flex justify-center -space-x-2"
            aria-label="Audience-specific respondent panel"
          >
            {audienceFaces.map((face, index) => (
              <span
                key={face}
                className="grid size-12 place-items-center rounded-full border-[3px] border-white text-xs font-semibold"
                style={{
                  background: [
                    "#f6c453",
                    "#82c4eb",
                    "#ee8f72",
                    "#9ed4b3",
                    "#c7b4ee",
                    "#f3b8ce",
                    "#b7d8d2",
                  ][index],
                }}
              >
                {face}
              </span>
            ))}
          </div>
          <p className="mb-5 text-sm font-semibold tracking-wide text-[#2383e2]">
            Synthetic audience research, built for marketing decisions
          </p>
          <h1 className="text-[clamp(3.1rem,7.7vw,6.8rem)] leading-[0.94] font-semibold tracking-[-0.07em] text-balance">
            Find the idea your audience would choose.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-balance text-black/60 sm:text-xl">
            Test copy, positioning, and visual concepts with distinct AI
            respondents shaped around the audience you actually want to reach.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="blue">
              <Link href="/sign-up">
                Create your first test <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-black/10 bg-white"
            >
              <a href="#example">See an example result</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-black/45">
            $6 welcome credit · No subscription · Directional evidence, not a
            crystal ball
          </p>
        </div>

        <div
          id="example"
          className="mx-auto mt-16 max-w-5xl rounded-2xl border border-black/10 bg-[#f7f7f5] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-3"
        >
          <div className="overflow-hidden rounded-xl border border-black/10 bg-white text-left">
            <div className="flex h-11 items-center justify-between border-b border-black/[0.07] px-4 text-xs text-black/50">
              <span>Spring campaign · Results</span>
              <span className="rounded bg-[#e9f4ef] px-2 py-1 text-[#26734d]">
                100 / 100 responses
              </span>
            </div>
            <div className="grid lg:grid-cols-[230px_1fr]">
              <aside className="hidden border-r border-black/[0.07] bg-[#fbfbfa] p-3 lg:block">
                <p className="px-2 py-2 text-xs font-medium text-black/45">
                  WORKSPACE
                </p>
                {[
                  ["Overview", BarChart3],
                  ["Responses", Users],
                  ["Synthesis", Sparkles],
                ].map(([label, Icon], index) => (
                  <div
                    key={String(label)}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${index === 0 ? "bg-black/[0.055]" : "text-black/55"}`}
                  >
                    <Icon className="size-4" /> {String(label)}
                  </div>
                ))}
              </aside>
              <div className="p-5 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-[#26734d]">
                      CLEAR WINNER
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                      Lead with the outcome
                    </h2>
                    <p className="mt-1 text-sm text-black/50">
                      Option B · 63 votes · strong preference
                    </p>
                  </div>
                  <div className="rounded-lg border border-black/[0.08] px-4 py-3 text-center">
                    <p className="text-2xl font-semibold">63%</p>
                    <p className="text-xs text-black/45">audience choice</p>
                  </div>
                </div>
                <div className="mt-7 space-y-4">
                  {[
                    ["B · Lead with the outcome", 63, "#2383e2"],
                    ["A · Lead with the process", 24, "#a7a7a2"],
                    ["C · Lead with urgency", 13, "#d0cfca"],
                  ].map(([label, score, color]) => (
                    <div key={String(label)}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium">{score}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/[0.055]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${score}%`,
                            background: String(color),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-black/[0.07] p-4">
                    <p className="text-xs font-medium text-black/45">
                      WHY IT WORKED
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      It made the value concrete before asking readers to
                      understand the product.
                    </p>
                  </div>
                  <div className="rounded-lg border border-black/[0.07] p-4">
                    <p className="text-xs font-medium text-black/45">
                      SEGMENT SIGNAL
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      Experienced buyers preferred specificity; newer buyers
                      wanted one line of context.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="use-cases"
        className="border-y border-black/[0.07] bg-[#f7f7f5] px-5 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#2383e2]">
              Make the next decision with evidence
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              A fast second opinion before you spend the budget.
            </h2>
            <p className="mt-5 text-lg leading-8 text-black/55">
              Plurena is designed for the choices that are expensive to get
              wrong and easy to debate forever.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {decisions.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-xl border border-black/[0.08] bg-white p-5"
              >
                <Icon className="size-5" />
                <p className="mt-8 font-medium">{label}</p>
                <p className="mt-1 text-sm leading-6 text-black/50">
                  Compare options through the needs, objections, and language of
                  your target audience.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-[#2383e2]">
                How it works
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
                The audience comes before the answer.
              </h2>
              <p className="mt-5 text-lg leading-8 text-black/55">
                Generic prompts produce generic feedback. Plurena first builds a
                varied panel inside your audience boundaries, then asks each
                respondent independently.
              </p>
            </div>
            <ol className="space-y-2">
              {[
                [
                  "01",
                  "Define the decision",
                  "Add your question and two or more text or image options.",
                ],
                [
                  "02",
                  "Describe the audience",
                  "Capture context, goals, constraints, and the people the message needs to move.",
                ],
                [
                  "03",
                  "Run independent responses",
                  "Distinct personas choose, explain tradeoffs, and record preference confidence.",
                ],
                [
                  "04",
                  "Act on the patterns",
                  "See deterministic rankings, objections, segment disagreements, and concrete iterations.",
                ],
              ].map(([number, title, description]) => (
                <li
                  key={number}
                  className="group grid grid-cols-[48px_1fr_auto] items-center gap-4 rounded-xl border border-transparent p-4 transition hover:border-black/[0.07] hover:bg-[#f7f7f5]"
                >
                  <span className="text-sm text-black/35">{number}</span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-black/50">
                      {description}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-black/25 transition group-hover:translate-x-0.5" />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-[#1f1f1f] p-7 text-white sm:p-10 lg:col-span-2">
            <Quote className="size-7 text-white/35" />
            <p className="mt-10 max-w-2xl text-2xl leading-10 font-medium tracking-[-0.02em] text-balance sm:text-3xl">
              “The strongest result is not always the loudest option. It is the
              one whose value survives different motivations and objections.”
            </p>
            <p className="mt-8 text-sm text-white/50">
              What Plurena is designed to surface
            </p>
          </div>
          <div
            id="pricing"
            className="rounded-2xl border border-black/[0.08] bg-[#f7f7f5] p-7 sm:p-8"
          >
            <p className="text-sm font-semibold">Pay as you go</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight">$5</span>
              <span className="text-black/45">increments</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-black/55">
              No subscription. Top up your balance when you need it. Tests start
              at $5 for 20 respondents.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "$6 welcome credit",
                "Server-verified balance",
                "Only charged once per test",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-[#26734d]" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="blue" className="mt-7 w-full">
              <Link href="/sign-up">Start a test</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-black/[0.07] px-5 py-20 text-center sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-6xl">
            Bring the audience into the room.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-black/55">
            Get rapid, directional feedback before the next campaign, redesign,
            or positioning decision.
          </p>
          <Button asChild size="lg" variant="blue" className="mt-8">
            <Link href="/sign-up">
              Create your first test <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-black/[0.07] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-black/45 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p>
            Directional synthetic research. Validate important decisions with
            real customers too.
          </p>
        </div>
      </footer>
    </main>
  );
}
