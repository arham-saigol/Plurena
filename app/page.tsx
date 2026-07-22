import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  FileText,
  ImageIcon,
  MessageSquareText,
  Package,
  Target,
} from "lucide-react";
import { AppEntryLink } from "@/components/app-entry-link";
import { Brand } from "@/components/brand";
import { FaqList } from "@/components/faq-list";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingDemo } from "@/components/marketing-demo";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Add your options",
    body: "Name the question and add two to eight options: headlines, positioning, offers, or creative concepts.",
  },
  {
    number: "02",
    title: "Define your audience",
    body: "Describe who the message is for and what shapes their judgment. Plurena builds a panel of distinct respondents to match.",
  },
  {
    number: "03",
    title: "See what wins",
    body: "Each respondent answers on their own. Plurena synthesizes the panel into a ranked report with the reasoning attached.",
  },
];

const useCases = [
  {
    icon: FileText,
    title: "Headlines & copy",
    body: "Put competing headlines or value props in front of the panel and ship the one that earns the click.",
  },
  {
    icon: MessageSquareText,
    title: "Offers & landing pages",
    body: "Hear objections and spot missing context before you pay for traffic.",
  },
  {
    icon: ImageIcon,
    title: "Creative concepts",
    body: "Get panel reactions to visual directions before the wrong concept costs you revenue.",
  },
  {
    icon: Target,
    title: "Positioning",
    body: "Compare ways to frame the same product before the market decides for you.",
  },
  {
    icon: BadgeDollarSign,
    title: "Pricing",
    body: "Compare price points to find the one customers see as fair and worth paying.",
  },
  {
    icon: Package,
    title: "Packaging",
    body: "Compare packaging designs, labels, and visual directions before they reach the shelf.",
  },
];

const faqs = [
  {
    question: "How should I use synthetic audience results?",
    answer:
      "Use Plurena to narrow your options, uncover objections buyers may raise, and choose what to validate next. Plurena provides directional research; it does not replace customer conversations. Confirm high-stakes pricing, legal, or brand decisions with real customers.",
  },
  {
    question: "How does Plurena build my audience?",
    answer:
      "You describe the people you need to reach and the context that shapes their choice. Plurena creates distinct synthetic respondents from that brief. Each respondent evaluates your options in isolation.",
  },
  {
    question: "What can I compare in one test?",
    answer:
      "Compare two to eight text or image options, including headlines, value propositions, offers, prices, positioning, packaging, and creative concepts. Keep all but one major variable consistent so you can tell what caused the preference.",
  },
  {
    question: "How many respondents do I need?",
    answer:
      "Each test supports 20 to 250 respondents. Choose a smaller panel for an early directional read. Use a larger panel when you want to examine how reactions differ across parts of your audience.",
  },
  {
    question: "Do respondents influence one another's answers?",
    answer:
      "No. Each respondent judges every option from their own perspective without seeing the other answers. Plurena combines those responses into a ranking, objections, audience differences, and next steps.",
  },
  {
    question: "How do credits and billing work?",
    answer:
      "One respondent costs one credit, so a test uses 20 to 250 credits. Your first 25 credits are free. Paid credits start at $10 for 50, never expire, and require no subscription.",
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
            <a href="#faq" className="hover:text-foreground transition">
              FAQ
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

      <section
        id="how-it-works"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10"
      >
        <div className="mx-auto max-w-[84rem]">
          <div className="mx-auto max-w-5xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-4xl leading-[1.08] font-bold tracking-[-0.04em] text-balance sm:text-[2.875rem] lg:whitespace-nowrap">
              Find your audience&apos;s top choice in 3 steps
            </h2>
          </div>

          <ol className="mx-auto mt-14 grid max-w-[72rem] gap-14 lg:grid-cols-3">
            {steps.map(({ number, title, body }, index) => (
              <li
                key={number}
                className="bg-card relative rounded-2xl border p-7 shadow-[0_0_0_5px_color-mix(in_srgb,var(--border)_55%,transparent),var(--shadow-sm)] sm:p-8 lg:min-h-64"
              >
                <span className="text-sm font-bold text-[var(--green)]">
                  {number}
                </span>
                <h3 className="mt-10 text-lg font-semibold tracking-[-0.025em] lg:mt-16">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-2.5 text-[15px] leading-6">
                  {body}
                </p>
                {index !== steps.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="text-muted-foreground absolute right-1/2 -bottom-[38px] z-10 size-5 translate-x-1/2 rotate-90 lg:top-1/2 lg:-right-[38px] lg:bottom-auto lg:translate-x-0 lg:-translate-y-1/2 lg:rotate-0"
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="mt-12 text-center">
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
            <p className="text-muted-foreground mt-2.5 text-[13px]">
              25 free credits. No card required
            </p>
          </div>
        </div>
      </section>

      <section
        id="use-cases"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10"
      >
        <div className="mx-auto max-w-[84rem]">
          <div className="mx-auto max-w-5xl text-center">
            <p className="eyebrow">Use cases</p>
            <h2 className="mt-3 text-4xl leading-[1.08] font-bold tracking-[-0.04em] text-balance sm:text-[2.875rem]">
              Test it before you bet on it
            </h2>
          </div>

          <div className="mx-auto mt-14 grid max-w-[72rem] gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="bg-card rounded-2xl border p-6 shadow-[0_0_0_5px_color-mix(in_srgb,var(--border)_55%,transparent),var(--shadow-sm)]"
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
      </section>

      <section
        id="pricing"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10"
      >
        <div className="mx-auto max-w-[72rem]">
          <div className="text-center">
            <p className="eyebrow">Pricing</p>
            <h2 className="mt-3 text-4xl leading-[1.08] font-bold tracking-[-0.04em] sm:text-[2.875rem] lg:whitespace-nowrap">
              Pay for respondents, not subscriptions
            </h2>
          </div>

          <div className="bg-card mt-12 grid overflow-hidden rounded-2xl border shadow-[0_0_0_5px_color-mix(in_srgb,var(--border)_55%,transparent),var(--shadow-sm)] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                Simple usage pricing
              </p>
              <div className="mt-8 grid grid-cols-[auto_auto_auto] items-center justify-start gap-6 sm:gap-10">
                <div>
                  <p className="text-5xl leading-none font-bold tracking-[-0.05em] tabular-nums sm:text-6xl">
                    1
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm font-medium">
                    credit
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-[var(--green-soft)] text-xl font-medium text-[var(--green)] sm:size-12">
                  =
                </span>
                <div>
                  <p className="text-5xl leading-none font-bold tracking-[-0.05em] tabular-nums sm:text-6xl">
                    1
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm font-medium">
                    respondent
                  </p>
                </div>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-6 border-t pt-7">
                <div>
                  <p className="text-xl font-semibold tracking-[-0.03em] tabular-nums">
                    20-250
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    respondents per test
                  </p>
                </div>
                <div>
                  <p className="text-xl font-semibold tracking-[-0.03em] tabular-nums">
                    $10
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    minimum top-up
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t bg-[var(--muted)]/55 p-7 sm:p-10 lg:border-t-0 lg:border-l lg:p-12">
              <p className="eyebrow">Start free</p>
              <h3 className="mt-3 text-2xl leading-tight font-semibold tracking-[-0.035em] sm:text-3xl">
                Your first 25 respondents
                <br className="hidden sm:block" /> are free.
              </h3>
              <ul className="mt-7 space-y-4 text-sm">
                {[
                  "No card required",
                  "No subscription",
                  "Credits never expire",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--green-soft)]">
                      <Check className="size-3.5 text-[var(--green)]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="accent"
                size="lg"
                className="mt-8 w-full"
              >
                <AppEntryLink signedOutHref="/sign-up">
                  Create your first test <ArrowRight />
                </AppEntryLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-4xl leading-[1.08] font-bold tracking-[-0.04em] sm:text-[2.875rem]">
            FAQ
          </h2>

          <div className="mt-10 sm:mt-12">
            <FaqList items={faqs} />
          </div>
        </div>
      </section>

      <section className="px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-10">
        <div className="bg-card mx-auto max-w-3xl rounded-2xl border px-4 py-16 shadow-[0_0_0_5px_color-mix(in_srgb,var(--border)_55%,transparent),var(--shadow-sm)] sm:px-10 sm:py-20">
          <h2 className="w-full max-w-none text-4xl leading-[1.08] font-bold tracking-[-0.04em] sm:text-[2.875rem] sm:text-balance lg:whitespace-nowrap">
            Put your options to the test
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 w-full max-w-none text-lg leading-8 sm:max-w-2xl sm:text-balance">
            Compare your options with synthetic respondents{" "}
            <br className="hidden sm:block" />
            and see what stands out.
          </p>
          <Button asChild size="lg" variant="accent" className="mt-8">
            <AppEntryLink signedOutHref="/sign-up">
              Create your first test <ArrowRight />
            </AppEntryLink>
          </Button>
          <p className="text-muted-foreground mt-2.5 text-[13px]">
            25 free credits. No card required
          </p>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
