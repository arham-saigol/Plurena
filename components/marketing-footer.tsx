import Link from "next/link";
import { AppEntryLink } from "@/components/app-entry-link";
import { Brand } from "@/components/brand";

const linkClassName =
  "rounded-sm text-sm text-white/80 transition-colors hover:text-white";

export function MarketingFooter() {
  return (
    <footer className="bg-[#202020] px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto grid max-w-[84rem] gap-12 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_13rem_13rem]">
        <div>
          <Brand className="text-white" />
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/55">
            Directional synthetic research for decisions that still deserve real
            customer validation.
          </p>
          <p className="mt-7 text-xs text-white/40">
            &copy; {new Date().getFullYear()} Plurena
          </p>
        </div>

        <nav aria-labelledby="footer-links-heading">
          <h2
            id="footer-links-heading"
            className="text-xs font-bold tracking-[0.14em] text-white/45 uppercase"
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
                Blogs
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
            className="text-xs font-bold tracking-[0.14em] text-white/45 uppercase"
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
