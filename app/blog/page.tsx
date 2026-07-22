import type { Metadata } from "next";
import { PublicPageShell } from "@/components/public-page-shell";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on synthetic research, message testing, and Plurena.",
};

export default function BlogPage() {
  return (
    <PublicPageShell sectionLabel="Blog">
      <p className="text-muted-foreground leading-7">
        No articles have been published yet. Check back for the first field
        note.
      </p>
    </PublicPageShell>
  );
}
