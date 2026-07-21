import {
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  ImageIcon,
  Layers,
  MessageSquareText,
  MessagesSquare,
  Target,
} from "lucide-react";
import { AppEntryLink } from "@/components/app-entry-link";
import { Brand } from "@/components/brand";
import { MarketingDemo } from "@/components/marketing-demo";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Frame the decision",
    body: "Name the question and add two to eight options: headlines, positioning, offers, or creative concepts.",
  },
  {
    number: "02",
    title: "Shape the audience",
    body: "Describe who the message is for and what shapes their judgment. Plurena builds a panel of distinct respondents to match.",
  },
  {
    number: "03",
    title: "Act on the evidence",
    body: "Each respondent answers on their own. Plurena synthesizes the panel into a ranked report with the reasoning attached.",
  },
];

const readingPoints = [
  {
    icon: BarChart3,
    title: "The answer first",
    body: "Reports open with the winner and the strength of the result, so the next step is clear from the first line.",
  },
  {
    icon: Layers,
    title: "The reasoning underneath",
    body: "Segment splits and objections sit one level down, ready when you need them.",
  },
  {
    icon: MessagesSquare,
    title: "Responses on the record",
    body: "Open any respondent to read why they chose what they chose, in their own words.",
  },
];

const useCases = [
  {
    icon: FileText,
    title: "Headlines & copy",
    body: "Put competing headlines or value props in front of the panel and ship the one that earns the click.",
  },
  {
    icon: Target,
    title: "Positioning",
    body: "Compare ways to frame the same product before the market decides for you.",
  },
  {
    icon: ImageIcon,
    title: "Creative concepts",
    body: "Get panel reactions to visual directions while they're still cheap to change.",
  },
  {
    icon: MessageSquareText,
    title: "Offers & landing pages",
    body: "Hear objections and spot missing context before you pay for traffic.",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-background min-h-screen overflow-hidden">
      <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Brand />
          <nav
            className="text-foreground hidden items-center gap-7 text-[15px] font-normal md:flex"
            aria-label="Main navigation"
          >
            <a
              href="#how-it-works"
              className="hover:text-foreground transition"
            >
              How it works
            </a>
            <a href="#use-cases" className="hover:text-foreground transition">
              Use cases
            </a>
            <a href="#pricing" className="hover:text-foreground transition">
              Pricing
            </a>
          </nav>
          <div className="flex items-center">
            <Button asChild variant="outline" size="sm" className="sm:h-9">
              <AppEntryLink signedOutHref="/sign-in">Log in</AppEntryLink>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-24 lg:px-10">
        <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[560px] max-w-[84rem] [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-60" />
        <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[420px] w-[820px] max-w-[95vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--green)_9%,transparent),transparent_68%)]" />

        <div className="mx-auto max-w-3xl -translate-y-4 text-center sm:-translate-y-9">
          <h1 className="text-[clamp(2.75rem,5.8vw,5rem)] leading-[1.05] font-bold tracking-[-0.045em] text-balance">
            Know what wins
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-[38rem] text-xl leading-8 text-balance">
            Compare your options with a synthetic audience
            <br className="hidden sm:block" /> and learn why one wins.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              variant="accent"
              className="h-13 px-6 text-base sm:min-w-56"
            >
              <AppEntryLink signedOutHref="/sign-up">
                Create your first test <ArrowRight />
              </AppEntryLink>
            </Button>
          </div>
          <p className="text-muted-foreground mt-2.5 text-[13px]">
            25 free credits. No card required
          </p>
        </div>

        <div
          id="product"
          className="mx-auto mt-14 max-w-[80rem] scroll-mt-24 sm:mt-24"
        >
          <p className="text-muted-foreground mb-3 text-center text-xs font-semibold tracking-[0.08em] uppercase">
            A sample report
          </p>
          <MarketingDemo />
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-10">
        <div className="mx-auto grid max-w-[84rem] gap-10 sm:grid-cols-3 sm:gap-8">
          {readingPoints.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="bg-accent grid size-9 place-items-center rounded-lg">
                <Icon className="size-4 text-[var(--green)]" />
              </span>
              <h3 className="mt-4 font-semibold tracking-[-0.015em]">
                {title}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10"
      >
        <div className="mx-auto max-w-[84rem]">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-3xl leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-4xl">
              From question to direction in three steps.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-8">
              Setup is a short brief. Plurena builds the panel, collects the
              answers, and writes the report.
            </p>
          </div>

          <ol className="bg-card mt-12 grid overflow-hidden rounded-2xl border shadow-[var(--shadow-sm)] sm:grid-cols-3 sm:divide-x">
            {steps.map(({ number, title, body }) => (
              <li
                key={number}
                className="border-b p-6 last:border-b-0 sm:border-b-0 sm:p-7"
              >
                <span className="text-xs font-bold text-[var(--green)]">
                  {number}
                </span>
                <h3 className="mt-10 font-semibold tracking-[-0.02em]">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="use-cases"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10"
      >
        <div className="mx-auto max-w-[84rem]">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="eyebrow">Use cases</p>
              <h2 className="mt-3 text-3xl leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-4xl">
                For work that’s easy to debate and costly to get wrong.
              </h2>
              <p className="text-muted-foreground mt-4 text-lg leading-8">
                Bring evidence to the decisions that get settled by taste,
                seniority, or whoever speaks last.
              </p>
              <Button asChild variant="outline" className="mt-7">
                <AppEntryLink signedOutHref="/sign-up">
                  Test your next decision <ArrowRight />
                </AppEntryLink>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {useCases.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="bg-card rounded-2xl border p-6 shadow-[var(--shadow-sm)]"
                >
                  <span className="bg-accent grid size-10 place-items-center rounded-xl">
                    <Icon className="size-4.5" />
                  </span>
                  <h3 className="mt-8 font-semibold tracking-[-0.02em]">
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10"
      >
        <div className="mx-auto grid max-w-[84rem] items-center gap-10 lg:grid-cols-[1fr_400px]">
          <div>
            <p className="eyebrow">Pricing</p>
            <h2 className="mt-3 text-3xl leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-4xl">
              Pay for respondents, not subscriptions.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl text-lg leading-8">
              One credit runs one respondent. Your first 25 are free, and
              credits never expire. Top up when the next decision needs
              evidence.
            </p>
          </div>
          <div className="bg-card rounded-2xl border p-7 shadow-[var(--shadow-sm)] sm:p-8">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tracking-[-0.05em]">1</span>
              <span className="text-muted-foreground pb-1 text-sm">
                credit / respondent
              </span>
            </div>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                "25 free credits, no card required",
                "Top-ups start at $10",
                "Automatic refunds if a respondent fails",
                "Credits never expire",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-[var(--green)]" />{" "}
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="accent" size="lg" className="mt-7 w-full">
              <AppEntryLink signedOutHref="/sign-up">
                Start with 25 free credits
              </AppEntryLink>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-10">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">Get started</p>
          <h2 className="mt-4 text-3xl leading-[1.06] font-bold tracking-[-0.04em] text-balance sm:text-5xl">
            Put your next decision in front of an audience.
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg leading-8">
            Run your first panel today and have the report before your next
            review.
          </p>
          <Button asChild size="lg" variant="accent" className="mt-8">
            <AppEntryLink signedOutHref="/sign-up">
              Create your first test <ArrowRight />
            </AppEntryLink>
          </Button>
        </div>
      </section>

      <footer className="border-t px-4 py-8 sm:px-6 lg:px-10">
        <div className="text-muted-foreground mx-auto flex max-w-[84rem] flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p className="max-w-md text-xs leading-5">
            Directional synthetic research. Validate high-stakes decisions with
            real customers too.
          </p>
        </div>
      </footer>
    </main>
  );
}
