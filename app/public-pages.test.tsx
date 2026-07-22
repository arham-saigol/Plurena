// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketingFooter } from "@/components/marketing-footer";
import BlogPage from "./blog/page";
import ChangelogPage from "./changelog/page";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";
import { GET } from "./llms.txt/route";

describe("public marketing pages", () => {
  it("links every requested footer destination", () => {
    const html = renderToStaticMarkup(<MarketingFooter />);

    expect(html).toContain('href="/sign-in"');
    expect(html).toContain('href="/#pricing"');
    expect(html).toContain('href="/changelog"');
    expect(html).toContain('href="/blog"');
    expect(html).toContain('href="/llms.txt"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain(">Blog</a>");
    expect(html).not.toContain(">Blogs</a>");
  });

  it("publishes complete legal documents", () => {
    const terms = renderToStaticMarkup(<TermsPage />);
    const privacy = renderToStaticMarkup(<PrivacyPage />);

    expect(terms).toContain("Limitation of liability");
    expect(terms).toContain("hello@plurena.com");
    expect(privacy).toContain("AI processing");
    expect(privacy).toContain("do not use submitted content to train");
  });

  it("identifies blog and changelog in the top navigation", () => {
    const blog = renderToStaticMarkup(<BlogPage />);
    const changelog = renderToStaticMarkup(<ChangelogPage />);

    expect(blog).toContain(">Blog</span>");
    expect(blog).toContain(">Blog</h1>");
    expect(blog).not.toContain("Research notes are on the way");
    expect(changelog).toContain(">Changelog</span>");
    expect(changelog).toContain(">Changelog</h1>");
    expect(changelog).not.toContain("What changes in Plurena");
  });

  it("serves llms.txt as plain text", async () => {
    const response = GET();

    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    await expect(response.text()).resolves.toContain("# Plurena");
  });
});
