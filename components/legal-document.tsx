import { PublicPageShell } from "@/components/public-page-shell";

export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <PublicPageShell eyebrow="Legal" title={title} description={description}>
      <div className="space-y-10 text-[15px] leading-7">
        <p className="text-muted-foreground text-sm">
          Effective date: <time dateTime="2026-07-22">July 22, 2026</time>
        </p>
        {children}
      </div>
    </PublicPageShell>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>
      <div className="text-muted-foreground mt-3 space-y-4">{children}</div>
    </section>
  );
}
