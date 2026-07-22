import Link from "next/link";
import { AppEntryLink } from "@/components/app-entry-link";
import { Brand } from "@/components/brand";

const linkClassName =
  "text-muted-foreground hover:text-foreground rounded-sm text-sm transition-colors";

export function MarketingFooter() {
  return (
    <footer className="bg-background text-foreground border-t px-4 py-14 sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto grid max-w-[84rem] gap-12 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_13rem_13rem]">
        <div>
          <Brand />
          <p className="text-muted-foreground mt-5 max-w-xs text-sm leading-6">
            Know what wins. Compare your options with a synthetic audience
            before you decide.
          </p>
          <p className="text-muted-foreground mt-7 text-xs">
            &copy; {new Date().getFullYear()} Plurena
          </p>
        </div>

        <nav aria-labelledby="footer-links-heading">
          <h2
            id="footer-links-heading"
            className="text-muted-foreground text-xs font-bold tracking-[0.14em] uppercase"
          >
            Links
          </h2>
          <ul className="mt-5 space-y-3">
            <li>
              <AppEntryLink signedOutHref="/sign-in" className={linkClassName}>
                Log in
              </AppEntryLink>
            </li>
            <li>
              <Link href="/#pricing" className={linkClassName}>
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/changelog" className={linkClassName}>
                Changelog
              </Link>
            </li>
            <li>
              <Link href="/blog" className={linkClassName}>
                Blog
              </Link>
            </li>
            <li>
              <a href="/llms.txt" className={linkClassName}>
                llms.txt
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal-heading">
          <h2
            id="footer-legal-heading"
            className="text-muted-foreground text-xs font-bold tracking-[0.14em] uppercase"
          >
            Legal
          </h2>
          <ul className="mt-5 space-y-3">
            <li>
              <Link href="/terms" className={linkClassName}>
                Terms of service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClassName}>
                Privacy policy
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
