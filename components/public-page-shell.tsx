import { AppEntryLink } from "@/components/app-entry-link";
import { Brand } from "@/components/brand";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";

type PublicPageShellProps = { children: React.ReactNode } & (
  | {
      sectionLabel: string;
      eyebrow?: never;
      title?: never;
      description?: never;
    }
  | {
      sectionLabel?: never;
      eyebrow: string;
      title: string;
      description: string;
    }
);

export function PublicPageShell({
  sectionLabel,
  eyebrow,
  title,
  description,
  children,
}: PublicPageShellProps) {
  return (
    <main className="bg-background flex min-h-screen flex-col">
      <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <Brand />
            {sectionLabel && (
              <>
                <span className="bg-border h-5 w-px" aria-hidden="true" />
                <span className="text-muted-foreground text-sm font-medium tracking-[0.04em] uppercase">
                  {sectionLabel}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center">
            <Button asChild variant="outline" size="sm">
              <AppEntryLink signedOutHref="/sign-in">Log in</AppEntryLink>
            </Button>
          </div>
        </div>
      </header>

      <article className="flex-1 px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <div className="mx-auto max-w-3xl">
          {sectionLabel ? (
            children
          ) : (
            <>
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="mt-3 text-4xl leading-[1.08] font-bold tracking-[-0.04em] text-balance sm:text-5xl">
                {title}
              </h1>
              <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
                {description}
              </p>
              <div className="mt-12 border-t pt-10">{children}</div>
            </>
          )}
        </div>
      </article>

      <MarketingFooter />
    </main>
  );
}
