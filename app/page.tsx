import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, ChartBar, Check, Images, Quotes, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "@/components/brand";
import { formatUsd, PANEL_PRICES } from "@/convex/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MarketingPage() {
  return <main className="marketing">
    <header className="marketing-nav"><Link href="/" aria-label="Plurena home"><Brand /></Link><nav><a href="#method">Method</a><a href="#pricing">Pricing</a><Show when="signed-out"><Button variant="outline" size="sm" nativeButton={false} render={<Link href="/sign-in" />}>Sign in</Button></Show><Show when="signed-in"><Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>Dashboard</Button></Show></nav></header>

    <section className="hero">
      <Badge variant="secondary" className="mb-5">AI respondent panels</Badge>
      <h1>Put your next decision in front of 20 people before lunch.</h1>
      <p className="hero-copy">Define an audience. Plurena builds a balanced set of personas, mixes AI models across the panel, and returns the evidence behind every answer.</p>
      <div className="hero-actions"><Show when="signed-out"><Button size="lg" nativeButton={false} render={<Link href="/sign-in" />}>Run your first test <ArrowRight size={16} /></Button></Show><Show when="signed-in"><Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>Open dashboard <ArrowRight size={16} /></Button></Show><span className="quiet-note">$6 credit after two onboarding answers</span></div>
      <Card className="research-sheet gap-0 py-0" aria-label="Example research result">
        <div className="sheet-head"><div><span className="status-dot complete" /> Complete</div><span>50 respondents · 11m 42s</span></div>
        <div className="sheet-question"><span>Concept comparison</span><h2>Which product page makes you most likely to buy?</h2></div>
        <div className="sheet-result"><div><p className="meta">Winner</p><h3>Option B</h3><p className="muted">Clearer proof and a price shown earlier.</p></div><div className="vote"><strong>58%</strong><span>29 votes</span></div></div>
        <div className="bars"><div><span>Option B</span><Progress value={58} /></div><div><span>Option A</span><Progress value={30} /></div><div><span>None</span><Progress value={12} /></div></div>
      </Card>
    </section>

    <section className="plain-section" id="method"><div className="section-intro"><p className="eyebrow">The workflow</p><h2>Research structure without research overhead.</h2></div><div className="method-grid">
      <Card><span>01</span><UsersThree size={22} /><h3>Describe the audience</h3><p>Choose locations, age, gender mix, and the perspective that matters to your decision.</p></Card>
      <Card><span>02</span><Images size={22} /><h3>Add the material</h3><p>Compare two to five pieces of copy or creative, or ask an open-ended question.</p></Card>
      <Card><span>03</span><ChartBar size={22} /><h3>Read the evidence</h3><p>See votes, themes, disagreements, respondent answers, and the persona context behind each response.</p></Card>
    </div></section>

    <section className="evidence-section"><div><Quotes size={24} /><h2>A panel that resists one-model consensus.</h2></div><div><p>Plurena spreads assignments across several model families and uses resilient fallback routing. Each generated respondent keeps a stable age, location, habits, constraints, and point of view for the full test.</p><p>You get a fresh panel for each normal run. Same-panel reruns let you isolate the effect of an edited option.</p></div></section>

    <section className="pricing-section" id="pricing"><div className="section-intro"><p className="eyebrow">Pay as you go</p><h2>Start with 20 respondents for $5.</h2><p>No subscription. Add credit from $10. Larger panels lower the price per response.</p></div><Card className="overflow-hidden py-0"><Table><TableHeader><TableRow><TableHead>Panel</TableHead><TableHead>Price</TableHead><TableHead>Per response</TableHead></TableRow></TableHeader><TableBody>{PANEL_PRICES.map(({ size, priceCents, discountPercent }) => <TableRow key={size}><TableCell>{size} respondents {discountPercent > 0 && <Badge variant="secondary" className="ml-2">{discountPercent}% off</Badge>}</TableCell><TableCell className="font-medium">{formatUsd(priceCents)}</TableCell><TableCell>{formatUsd(Math.round(priceCents / size))}</TableCell></TableRow>)}</TableBody></Table></Card></section>

    <section className="final-cta"><Check size={22} weight="bold" /><h2>Your next test can be running in minutes.</h2><p>Answer two onboarding questions to claim $6, enough for a 20-person panel.</p><Button size="lg" nativeButton={false} render={<Link href="/sign-in" />}>Continue with Google <ArrowRight size={16} /></Button></section>
    <footer><Brand /><span>© {new Date().getFullYear()} Plurena</span><span>AI responses can contain errors. Use results as research input, not ground truth.</span></footer>
  </main>;
}
