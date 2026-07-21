import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  FileText,
  ImageIcon,
  MessageSquareText,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { AppEntryLink } from "@/components/app-entry-link";
import { Brand } from "@/components/brand";
import { MarketingDemo } from "@/components/marketing-demo";
import { Button } from "@/components/ui/button";

const useCases = [
  {
    icon: FileText,
    title: "Copy and headlines",
    body: "See which promise feels clearest, most credible, and worth acting on.",
  },
  {
    icon: Target,
    title: "Positioning",
    body: "Compare ways to frame the same product before the market decides for you.",
  },
  {
    icon: ImageIcon,
    title: "Creative concepts",
    body: "Put visual directions in front of a varied panel, not just the loudest stakeholder.",
  },
  {
    icon: MessageSquareText,
    title: "Offers and landing pages",
    body: "Surface objections and missing context before you send paid traffic.",
  },
];

const steps = [
  [
    "01",
    "Frame one decision",
    "Add a focused question and the options you are genuinely choosing between.",
  ],
  [
    "02",
    "Define the audience",
    "Describe the context, motivations, constraints, and category familiarity that matter.",
  ],
  [
    "03",
    "Run a varied panel",
    "Distinct synthetic respondents evaluate independently, then explain their choice.",
  ],
  [
    "04",
    "Act on the pattern",
    "Start with the direction, inspect the evidence, and open individual voices when needed.",
  ],
];

export default function LandingPage() {
  return (
    <main className="marketing min-h-screen overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fbfaf9]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Brand />
          <nav
            className="hidden items-center gap-7 text-sm font-medium text-black/55 md:flex"
            aria-label="Main navigation"
          >
            <a href="#product" className="transition hover:text-black">
              Product
            </a>
            <a href="#how-it-works" className="transition hover:text-black">
              How it works
            </a>
            <a href="#use-cases" className="transition hover:text-black">
              Use cases
            </a>
            <a href="#pricing" className="transition hover:text-black">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <AppEntryLink signedOutHref="/sign-in">Log in</AppEntryLink>
            </Button>
            <Button
              asChild
              variant="blue"
              size="sm"
              className="sm:h-10 sm:px-4"
            >
              <AppEntryLink signedOutHref="/sign-up">Start free</AppEntryLink>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative px-4 pt-20 pb-18 sm:px-6 sm:pt-28 sm:pb-24 lg:px-10">
        <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[680px] max-w-6xl [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-65" />
        <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[520px] w-[900px] max-w-[95vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(225,101,64,0.11),transparent_68%)]" />

        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-xs font-semibold text-black/55 shadow-[var(--shadow-sm)]">
            <Sparkles className="size-3.5 text-[#e16540]" />
            Audience research for decisions in motion
          </div>
          <h1 className="mt-7 text-[clamp(3.25rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.065em] text-balance">
            Know what your audience would choose
            <span className="relative sm:whitespace-nowrap">
              {" "}
              before you ship.
              <span className="absolute inset-x-0 bottom-[0.04em] -z-10 h-[0.19em] rounded-full bg-[#f4c5b6]" />
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-balance text-black/56 sm:text-xl">
            Compare copy, positioning, and creative with distinct synthetic
            respondents shaped around the people you need to reach.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="blue" className="sm:min-w-52">
              <AppEntryLink signedOutHref="/sign-up">
                Create your first test <ArrowRight />
              </AppEntryLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-black/10 bg-white sm:min-w-44"
            >
              <a href="#product">Explore a result</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-black/42">
            25 welcome credits · No card required · Pay only for respondents
          </p>
        </div>

        <div
          id="product"
          className="mx-auto mt-16 max-w-5xl scroll-mt-24 sm:mt-20"
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-black/42">
            <span className="h-px w-8 bg-black/10" />
            Try the report
            <span className="h-px w-8 bg-black/10" />
          </div>
          <MarketingDemo />
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-black/[0.07] bg-white px-4 py-20 sm:px-6 sm:py-26 lg:px-10"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="eyebrow">From question to direction</p>
            <h2 className="mt-3 text-4xl leading-[1.02] font-extrabold tracking-[-0.055em] text-balance sm:text-5xl">
              A clear research flow, without research theatre.
            </h2>
            <p className="mt-5 text-lg leading-8 text-black/52">
              Every step keeps the decision visible, so setup stays focused and
              the report remains easy to trust.
            </p>
          </div>

          <ol className="mt-12 grid overflow-hidden rounded-2xl border border-black/[0.08] bg-[#fbfaf9] sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, body]) => (
              <li
                key={number}
                className="group min-h-64 border-b border-black/[0.07] p-6 last:border-b-0 sm:border-r sm:nth-[2]:border-r-0 lg:border-b-0 lg:last:border-r-0 lg:nth-[2]:border-r"
              >
                <span className="text-xs font-bold text-[#e16540]">
                  {number}
                </span>
                <h3 className="mt-14 text-lg font-bold tracking-[-0.025em]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-black/50">{body}</p>
                <ChevronRight className="mt-5 size-4 text-black/25 transition group-hover:translate-x-1 group-hover:text-black/55" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="use-cases" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-18">
            <div>
              <p className="eyebrow">Built for the next choice</p>
              <h2 className="mt-3 text-4xl leading-[1.03] font-extrabold tracking-[-0.055em] text-balance sm:text-5xl">
                Resolve the debate before it becomes spend.
              </h2>
              <p className="mt-5 text-lg leading-8 text-black/52">
                Plurena is for work that is costly to get wrong and easy to
                debate from personal taste.
              </p>
              <Button asChild variant="outline" className="mt-7 bg-white">
                <AppEntryLink signedOutHref="/sign-up">
                  Test a decision <ArrowRight />
                </AppEntryLink>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {useCases.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-black/[0.075] bg-white p-6 shadow-[var(--shadow-sm)]"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[#f4f2ef]">
                    <Icon className="size-4.5" />
                  </span>
                  <h3 className="mt-10 font-bold tracking-[-0.02em]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/50">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-10">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#201f1d] text-white shadow-[var(--shadow-lift)]">
          <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-xs font-bold tracking-[0.1em] text-[#ef805e] uppercase">
                Designed for comprehension
              </p>
              <h2 className="mt-4 text-4xl leading-[1.03] font-extrabold tracking-[-0.055em] text-balance sm:text-5xl">
                The answer first. The evidence when you need it.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/55">
                Results lead with the decision and its strength, then reveal
                supporting patterns, disagreements, and individual respondent
                perspectives in layers.
              </p>
            </div>
            <div className="grid gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-1">
              {[
                [
                  BarChart3,
                  "Scan",
                  "One direction and a compact evidence strip.",
                ],
                [
                  Users,
                  "Understand",
                  "Audience patterns explain where the result holds.",
                ],
                [
                  MessageSquareText,
                  "Investigate",
                  "Open individual voices without losing context.",
                ],
              ].map(([Icon, title, body]) => (
                <div
                  key={String(title)}
                  className="bg-[#262522] p-6 sm:p-7 lg:px-10"
                >
                  <Icon className="size-5 text-[#ef805e]" />
                  <p className="mt-4 font-bold">{String(title)}</p>
                  <p className="mt-1 text-sm leading-6 text-white/48">
                    {String(body)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-black/[0.07] bg-white px-4 py-20 sm:px-6 sm:py-26 lg:px-10"
      >
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="eyebrow">Simple credits</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.055em] sm:text-5xl">
              Pay for research, not another subscription.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-black/52">
              One credit runs one respondent. Choose the panel size that fits
              the decision, and keep unused credits for later.
            </p>
          </div>
          <div className="rounded-2xl border border-black/[0.08] bg-[#fbfaf9] p-7 shadow-[var(--shadow-sm)] sm:p-8">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-extrabold tracking-[-0.06em]">
                1
              </span>
              <span className="pb-1 text-sm text-black/45">
                credit / respondent
              </span>
            </div>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                "25 welcome credits",
                "No subscription or card to start",
                "Automatic refunds for failed respondent work",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check className="size-4 text-[#237a57]" /> {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="blue" size="lg" className="mt-7 w-full">
              <AppEntryLink signedOutHref="/sign-up">
                Start with 25 credits
              </AppEntryLink>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-black/[0.07] px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">The next decision is waiting</p>
          <h2 className="mt-4 text-4xl leading-[1.02] font-extrabold tracking-[-0.06em] text-balance sm:text-6xl">
            Bring the audience into the room.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-black/50">
            Get rapid directional evidence before the campaign, redesign, or
            positioning decision ships.
          </p>
          <Button asChild size="lg" variant="blue" className="mt-8">
            <AppEntryLink signedOutHref="/sign-up">
              Create your first test <ArrowRight />
            </AppEntryLink>
          </Button>
        </div>
      </section>

      <footer className="border-t border-black/[0.07] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-black/42 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p>
            Directional synthetic research. Validate high-stakes decisions with
            real customers too.
          </p>
        </div>
      </footer>
    </main>
  );
}
