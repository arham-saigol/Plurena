const content = `# Plurena

> Plurena compares marketing options with a synthetic audience and explains why one option wins.

Plurena is a directional research product for testing headlines, value propositions, offers, pricing, positioning, packaging, and creative concepts. Users describe an audience, submit two to eight text or image options, and choose a panel of 20 to 250 synthetic respondents. Each respondent evaluates the options independently. Plurena reports exact vote statistics alongside AI-generated interpretation, objections, audience differences, and suggested next tests.

Synthetic audience results do not represent surveys of real people and should not replace customer research for high-stakes decisions.

## Public pages

- Homepage and pricing: https://plurena.app/
- Blog: https://plurena.app/blog
- Changelog: https://plurena.app/changelog
- Terms of Service: https://plurena.app/terms
- Privacy Policy: https://plurena.app/privacy

## Contact

- Email: hello@plurena.com
`;

export const dynamic = "force-static";

export function GET() {
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
