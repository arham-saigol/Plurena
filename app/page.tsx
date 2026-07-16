import Link from "next/link";
import { Show } from "@clerk/nextjs";
import {
  ArrowRight,
  ChartBar,
  Check,
  CheckCircle,
  ChatText,
  Images,
  Quotes,
  ShieldCheck,
  Sparkle,
  TrendUp,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { Brand } from "@/components/brand";
import { formatUsd, PANEL_PRICES } from "@/convex/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const workflow = [
  {
    icon: UsersThree,
    title: "Define the audience",
    description: "Set the locations, age range, gender mix, behaviors, and context that matter to the decision.",
  },
  {
    icon: Images,
    title: "Add what you’re testing",
    description: "Compare two to five concepts or ask one focused, open-ended question.",
  },
  {
    icon: ChartBar,
    title: "Read the evidence",
    description: "See the aggregate, themes, disagreements, individual answers, and persona context.",
  },
];

const benefits = [
  ["Balanced by design", "A purposeful mix of personas and model families—not one model answering twenty times."],
  ["Built for decisions", "Clear rankings, themes, disagreements, and next actions instead of a wall of synthetic text."],
  ["Fast to rerun", "Use a fresh panel for a new read or keep the same panel to isolate a changed variable."],
  ["Pay only when needed", "No subscription or seat pricing. Start with a 20-person panel for $5."],
];

export default function MarketingPage() {
  return (
    <div className="marketing">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="marketing-header">
        <div className="marketing-nav">
          <Link href="/" aria-label="Plurena home"><Brand /></Link>
          <nav aria-label="Main navigation">
            <a href="#method">How it works</a>
            <a href="#evidence">Why Plurena</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="marketing-nav-actions">
            <Show when="signed-out">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/sign-in" />}>Sign in</Button>
              <Button size="sm" nativeButton={false} render={<Link href="/sign-in" />}>Start a test <ArrowRight /></Button>
            </Show>
            <Show when="signed-in">
              <Button size="sm" nativeButton={false} render={<Link href="/dashboard" />}>Open workspace <ArrowRight /></Button>
            </Show>
          </div>
        </div>
      </header>

      <main id="main-content">
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy-block">
          <Badge variant="outline" className="hero-badge"><Sparkle weight="fill" /> AI respondent panels for focused research</Badge>
          <h1>Better answers<br />before bigger bets<span>.</span></h1>
          <p className="hero-copy">Put your next product, creative, or messaging decision in front of a purpose-built AI panel—and get structured evidence back in minutes.</p>
          <div className="hero-actions">
            <Show when="signed-out"><Button size="lg" nativeButton={false} render={<Link href="/sign-in" />}>Run your first test <span className="button-divider" /><ArrowRight /></Button></Show>
            <Show when="signed-in"><Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>Open workspace <span className="button-divider" /><ArrowRight /></Button></Show>
            <Button variant="outline" size="lg" nativeButton={false} render={<a href="#method" />}>See how it works</Button>
          </div>
          <p className="hero-note"><CheckCircle weight="fill" /> Claim $6 welcome credit after two onboarding answers</p>
        </div>

        <div className="product-preview" aria-label="Example Plurena research result">
          <div className="preview-sidebar">
            <Brand compact />
            <span className="preview-nav active"><ChartBar /> Tests</span>
            <span className="preview-nav"><UsersThree /> Results</span>
            <div className="preview-user"><span>AM</span><i /></div>
          </div>
          <div className="preview-main">
            <div className="preview-topbar"><span>Concept test / Spring campaign</span><Badge variant="secondary"><i /> Complete</Badge></div>
            <div className="preview-content">
              <div className="preview-heading"><div><span>Research overview</span><h2>Which direction feels most credible?</h2><p>50 respondents · completed in 11m 42s</p></div><div><small>Responses</small><strong>50<em>/50</em></strong></div></div>
              <div className="preview-grid">
                <Card className="preview-result-card">
                  <div className="preview-card-title"><div><span>Panel ranking</span><h3>Clear preference for Option B</h3></div><TrendUp /></div>
                  <div className="preview-rank winner"><b>01</b><div><span><strong>Option B</strong><small>Winner</small><em>29 votes</em></span><Progress value={58} /></div><strong>58%</strong></div>
                  <div className="preview-rank"><b>02</b><div><span><strong>Option A</strong><em>15 votes</em></span><Progress value={30} /></div><strong>30%</strong></div>
                  <div className="preview-rank"><b>03</b><div><span><strong>None</strong><em>6 votes</em></span><Progress value={12} /></div><strong>12%</strong></div>
                </Card>
                <Card className="preview-insight-card">
                  <span>Research synthesis</span>
                  <h3>Why Option B won</h3>
                  <p>Respondents trusted the clearer proof and earlier price signal.</p>
                  <div><Quotes weight="fill" /><p>“I understand the value before I’m asked to commit.”</p></div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="benefit-strip" aria-label="Plurena benefits">
        {benefits.map(([title, description], index) => <article key={title}><span>/{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{description}</p></article>)}
      </section>

      <section className="plain-section method-section" id="method">
        <div className="section-intro centered-intro"><p className="eyebrow">One calm workflow</p><h2>From open question to usable evidence.</h2><p>Purpose-built research structure without recruiting, scheduling, or spreadsheet cleanup.</p></div>
        <div className="method-grid">
          {workflow.map(({ icon: Icon, title, description }, index) => <Card key={title}><div className="method-card-top"><span>0{index + 1}</span><Icon /></div><div><h3>{title}</h3><p>{description}</p></div></Card>)}
        </div>
      </section>

      <section className="evidence-section" id="evidence">
        <div className="evidence-copy"><p className="eyebrow">Designed for signal</p><h2>A panel that resists one-model consensus.</h2><p>Plurena distributes assignments across model families and gives each respondent a stable point of view, needs, habits, and constraints for the whole study.</p><ul><li><ShieldCheck weight="fill" /> Stable persona context per respondent</li><li><ShieldCheck weight="fill" /> Resilient fallback routing</li><li><ShieldCheck weight="fill" /> Fresh-panel and same-panel reruns</li></ul></div>
        <div className="evidence-visual">
          <div className="model-orbit"><span>Panel</span><strong>50</strong><small>balanced personas</small></div>
          {["Audience", "Context", "Models", "Evidence"].map((label, index) => <div key={label} className={`orbit-node node-${index + 1}`}><i />{label}</div>)}
          <div className="evidence-caption"><ChatText /><span><strong>Every answer stays inspectable.</strong> Read the aggregate, then trace it back to individual respondents.</span></div>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="section-intro"><p className="eyebrow">Simple pricing</p><h2>Research when you need it. No subscription.</h2><p>Add credit from $10 and spend it across any panel size. Larger studies automatically cost less per response.</p><div className="pricing-points"><span><Check /> No recurring plan</span><span><Check /> Credit never tied to seats</span><span><Check /> Price shown before launch</span></div></div>
        <Card className="pricing-card"><div className="pricing-card-head"><span>Panel pricing</span><Badge variant="secondary">Pay as you go</Badge></div><Table><TableHeader><TableRow><TableHead>Panel</TableHead><TableHead>Price</TableHead><TableHead>Per response</TableHead></TableRow></TableHeader><TableBody>{PANEL_PRICES.map(({ size, priceCents, discountPercent }) => <TableRow key={size}><TableCell><strong>{size}</strong> respondents {discountPercent > 0 && <Badge variant="secondary">Save {discountPercent}%</Badge>}</TableCell><TableCell className="font-medium">{formatUsd(priceCents)}</TableCell><TableCell>{formatUsd(Math.round(priceCents / size))}</TableCell></TableRow>)}</TableBody></Table><div className="pricing-card-foot"><span>Start with a 20-person panel for $5.</span><Show when="signed-out"><Button size="sm" nativeButton={false} render={<Link href="/sign-in" />}>Get started <ArrowRight /></Button></Show><Show when="signed-in"><Button size="sm" nativeButton={false} render={<Link href="/dashboard" />}>Open workspace <ArrowRight /></Button></Show></div></Card>
      </section>

      <section className="final-cta"><div className="cta-glow" /><Badge variant="outline">Your next study</Badge><h2>Make the next decision with more signal.</h2><p>Build a focused panel, launch in minutes, and keep the evidence behind every result.</p><Show when="signed-out"><Button size="lg" nativeButton={false} render={<Link href="/sign-in" />}>Start with $6 credit <span className="button-divider" /><ArrowRight /></Button></Show><Show when="signed-in"><Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>Open workspace <span className="button-divider" /><ArrowRight /></Button></Show></section>

      </main>
      <footer><Link href="/"><Brand /></Link><nav><a href="#method">How it works</a><a href="#pricing">Pricing</a><Show when="signed-out"><Link href="/sign-in">Sign in</Link></Show><Show when="signed-in"><Link href="/dashboard">Workspace</Link></Show></nav><span>© {new Date().getFullYear()} Plurena · AI responses can contain errors.</span></footer>
    </div>
  );
}
