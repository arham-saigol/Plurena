import type { Metadata } from "next";
import { PublicPageShell } from "@/components/public-page-shell";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Product updates and improvements from Plurena.",
};

export default function ChangelogPage() {
  return (
    <PublicPageShell sectionLabel="Changelog">
      <p className="text-muted-foreground leading-7">
        The public changelog starts with the next release.
      </p>
    </PublicPageShell>
  );
}
