import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Plurena.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="These terms govern your access to Plurena and your use of its synthetic audience research tools."
    >
      <LegalSection title="1. Agreement">
        <p>
          These Terms of Service form an agreement between you and Plurena, an
          online service operated by an individual (&quot;Plurena,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an
          account or using the service, you agree to these terms and our Privacy
          Policy. If you use Plurena for an organization, you confirm that you
          can bind that organization to these terms.
        </p>
        <p>
          You must be at least 18 years old and legally able to enter a contract
          to use Plurena. Do not use the service if you do not agree to these
          terms.
        </p>
      </LegalSection>

      <LegalSection title="2. The service">
        <p>
          Plurena lets you compare text and image options with AI-generated
          synthetic respondents. Reports may include rankings, simulated
          reactions, objections, and model-generated analysis. Plurena provides
          directional research, not measurements of real people or guaranteed
          market outcomes.
        </p>
        <p>
          You remain responsible for your business, pricing, legal, financial,
          employment, healthcare, and other decisions. Validate consequential
          decisions with qualified professionals and real customers. We may
          improve, change, suspend, or discontinue features as the service
          develops.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and security">
        <p>
          You must provide accurate account information and keep your login
          credentials secure. You are responsible for activity under your
          account. Tell us at hello@plurena.com if you suspect unauthorized use.
          You may not share access in a way that bypasses service limits or
          impersonate another person.
        </p>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          You retain ownership of questions, audience descriptions, options,
          images, and other material you submit (&quot;User Content&quot;). You
          grant us a worldwide, non-exclusive license to host, copy, process,
          transmit, and display User Content only as needed to provide, secure,
          maintain, and improve the service.
        </p>
        <p>
          You confirm that you have the rights and permissions needed to submit
          User Content and process any personal data it contains. Do not submit
          confidential, regulated, or sensitive personal data unless you have
          assessed the service and determined that its use is lawful and
          appropriate. Our Privacy Policy explains how service providers and AI
          providers process submitted material.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You may not use Plurena to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>break the law or infringe another person&apos;s rights;</li>
          <li>
            generate or test fraud, malware, harassment, exploitation, or
            deceptive impersonation;
          </li>
          <li>
            make automated decisions about a real person&apos;s eligibility,
            employment, housing, credit, insurance, healthcare, or legal rights;
          </li>
          <li>
            probe, disrupt, overload, reverse engineer, scrape, or bypass the
            service&apos;s security or usage controls; or
          </li>
          <li>
            resell access, share credentials, or use outputs to train a
            competing model or service without our written permission.
          </li>
        </ul>
        <p>
          We may investigate suspected misuse and suspend or terminate access
          when needed to protect users, providers, or the service.
        </p>
      </LegalSection>

      <LegalSection title="6. Credits, payments, and refunds">
        <p>
          Plurena sells prepaid credits through a payment processor. The
          checkout page shows the price, taxes, currency, and credit amount
          before purchase. One respondent currently costs one credit. We may
          change future pricing, but a change will not reduce credits already in
          your balance.
        </p>
        <p>
          Purchased credits are not cash, cannot be transferred, and have no
          value outside Plurena. Except where law requires otherwise, purchases
          are final. If service processing permanently fails, Plurena restores
          credits for failed respondents under the refund behavior shown in the
          product. Payment refunds, disputes, or chargebacks may result in a
          matching reversal of credits.
        </p>
      </LegalSection>

      <LegalSection title="7. Plurena property and feedback">
        <p>
          Plurena and its licensors own the service, software, design, branding,
          and related intellectual property, excluding User Content. These terms
          give you a limited, revocable, non-transferable right to use the
          service for its intended purpose.
        </p>
        <p>
          If you send feedback, you allow us to use it without restriction or
          compensation. This does not transfer ownership of your User Content.
        </p>
      </LegalSection>

      <LegalSection title="8. Third-party services">
        <p>
          Plurena relies on providers for authentication, hosting, data storage,
          payments, and AI inference. Their services may have separate terms and
          can affect availability. We are not responsible for third-party
          services outside our control.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspension and termination">
        <p>
          You may stop using Plurena and delete your authentication account from
          the profile settings. Contact hello@plurena.com for requests involving
          application data. We may suspend or terminate access if you breach
          these terms, create security or legal risk, fail to pay, or misuse the
          service.
        </p>
        <p>
          Provisions that by their nature should continue after termination will
          survive, including payment obligations, intellectual property terms,
          disclaimers, liability limits, and dispute terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers">
        <p>
          To the extent permitted by law, Plurena is provided &quot;as is&quot;
          and &quot;as available.&quot; We disclaim implied warranties of
          merchantability, fitness for a particular purpose, non-infringement,
          and uninterrupted or error-free operation. AI systems can produce
          incomplete, inaccurate, biased, or unexpected results. You must review
          outputs before relying on or publishing them.
        </p>
        <p>
          Some jurisdictions do not allow certain warranty exclusions, so parts
          of this section may not apply to you.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the extent permitted by law, Plurena will not be liable for
          indirect, incidental, special, consequential, exemplary, or punitive
          damages, or for lost profits, revenue, data, goodwill, or business
          opportunities. Plurena&apos;s total liability arising from the service
          or these terms will not exceed the amount you paid to Plurena during
          the 12 months before the event giving rise to the claim.
        </p>
        <p>
          These limits do not apply where the law prohibits them or to liability
          that cannot legally be limited.
        </p>
      </LegalSection>

      <LegalSection title="12. Indemnity">
        <p>
          To the extent permitted by law, you will defend and indemnify Plurena
          against third-party claims, losses, and reasonable costs arising from
          your User Content, your unlawful use of the service, or your material
          breach of these terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Disputes and applicable law">
        <p>
          Before filing a claim, you agree to contact hello@plurena.com and give
          us 30 days to try to resolve the dispute informally. The laws that
          apply where the operator resides govern these terms, without regard to
          conflict-of-law rules. Mandatory consumer protections available to you
          remain unchanged.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes and contact">
        <p>
          We may update these terms as the service or law changes. We will post
          the revised terms here and update the effective date. If a change
          materially affects your rights, we will provide reasonable notice.
          Continued use after the updated terms take effect means you accept
          them.
        </p>
        <p>
          Contact Plurena about these terms at{" "}
          <a
            href="mailto:hello@plurena.com"
            className="text-foreground underline underline-offset-4"
          >
            hello@plurena.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
