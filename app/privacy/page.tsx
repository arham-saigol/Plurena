import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Plurena collects, uses, and shares personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This policy explains what information Plurena handles, why we use it, and the choices available to you."
    >
      <LegalSection title="1. Scope and operator">
        <p>
          This Privacy Policy applies to Plurena&apos;s website, application,
          and related support. Plurena is an online service operated by an
          individual and acts as the controller of personal information
          described here. It does not cover third-party websites or services
          that publish their own privacy policies.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground font-semibold">
              Account information:
            </strong>{" "}
            your name, email address, profile image, authentication identifiers,
            connected sign-in method, and account security information.
          </li>
          <li>
            <strong className="text-foreground font-semibold">
              User Content:
            </strong>{" "}
            test names, questions, audience and context descriptions, text or
            image options, and other material you submit.
          </li>
          <li>
            <strong className="text-foreground font-semibold">
              Results and service records:
            </strong>{" "}
            synthetic personas, responses, reports, test status, credit balance,
            credit ledger, and processing records.
          </li>
          <li>
            <strong className="text-foreground font-semibold">
              Payment information:
            </strong>{" "}
            selected credit package, checkout and transaction identifiers,
            purchase status, refund or dispute records, and billing email. Our
            payment processor handles payment-card details; Plurena does not
            store full card numbers.
          </li>
          <li>
            <strong className="text-foreground font-semibold">
              Technical information:
            </strong>{" "}
            session, device, browser, IP address, request, security, and error
            information generated when you use the service. The systems used to
            host and secure Plurena may collect these records for delivery and
            security.
          </li>
          <li>
            <strong className="text-foreground font-semibold">
              Communications:
            </strong>{" "}
            messages and information you send when you request support or make a
            legal or privacy request.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <p>We use information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>create and secure accounts and authenticate users;</li>
          <li>
            run tests, generate synthetic respondents, process options, and
            produce reports;
          </li>
          <li>maintain credit balances and process purchases and refunds;</li>
          <li>
            operate, troubleshoot, protect, measure, and improve the service;
          </li>
          <li>respond to support, legal, and privacy requests; and</li>
          <li>comply with law, enforce our terms, and prevent abuse.</li>
        </ul>
        <p>
          Depending on where you live, we rely on performance of our contract,
          our legitimate interests in operating and securing Plurena, compliance
          with legal obligations, and consent where the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="4. AI processing">
        <p>
          Plurena sends test instructions and relevant User Content to AI
          inference providers to create synthetic personas, evaluate options,
          and synthesize reports. This may include audience descriptions, text,
          images, and supporting context. Our inference providers do not use
          submitted content to train their models.
        </p>
        <p>
          Do not include personal, confidential, or regulated information in a
          test unless you have authority to process it and have decided that
          third-party AI processing is appropriate. AI providers process this
          material under their own service terms and data-handling commitments.
        </p>
      </LegalSection>

      <LegalSection title="5. How we share information">
        <p>We disclose information only as needed to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>authenticate users and protect account security;</li>
          <li>host the website, application data, and uploaded files;</li>
          <li>
            process checkout, payments, taxes, refunds, and payment disputes;
          </li>
          <li>
            use AI inference and model providers to generate and synthesize
            results;
          </li>
          <li>
            comply with law, legal process, or a valid government request, or
            protect rights, safety, and service integrity; and
          </li>
          <li>
            complete a merger, financing, acquisition, reorganization, or sale
            of assets, subject to appropriate confidentiality protections.
          </li>
        </ul>
        <p>
          We do not sell personal information or share it for cross-context
          behavioral advertising.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and local storage">
        <p>
          Plurena and its authentication service use cookies or similar browser
          storage to maintain sign-in sessions, prevent abuse, remember security
          state, and provide core features. Plurena also stores your theme
          preference in the browser. We do not currently run advertising
          trackers or a product analytics service. Your browser can block
          storage, but account and application features may stop working.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention and deletion">
        <p>
          We retain account information, User Content, reports, and service
          records while your account is active and as needed to provide the
          service. We may keep transaction, credit-ledger, security, dispute,
          and legal records for longer when required for accounting, fraud
          prevention, enforcement, or legal compliance.
        </p>
        <p>
          You can delete your authentication account through profile settings.
          Email hello@plurena.com to request deletion of associated application
          data. Deletion may take time to propagate through backups and service
          providers, and we may retain information when the law or a legitimate
          legal claim requires it.
        </p>
      </LegalSection>

      <LegalSection title="8. International processing">
        <p>
          Plurena and its providers may process information in countries other
          than yours. Those countries may have different data-protection laws.
          Where required, we and our providers use recognized transfer
          safeguards for international processing.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          Depending on your location, you may have rights to access, correct,
          delete, or receive a copy of your personal information; object to or
          restrict processing; withdraw consent; or appeal our response. You may
          also complain to your local data-protection authority.
        </p>
        <p>
          Send requests to hello@plurena.com. We may need to verify your
          identity before acting. Authorized agents should provide proof of
          authority. We will not discriminate against you for exercising a
          privacy right.
        </p>
      </LegalSection>

      <LegalSection title="10. Security">
        <p>
          We use access controls, private file storage, server-side credentials,
          signed payment webhooks, and other technical and organizational
          safeguards designed to protect information. No internet service can
          guarantee absolute security. Use a secure sign-in account and notify
          us if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          Plurena is not directed to children under 18, and we do not knowingly
          collect their personal information. Contact us if you believe a child
          has submitted personal information to the service.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes and contact">
        <p>
          We may update this policy as the service or law changes. We will post
          the revised policy here, update the effective date, and provide
          additional notice when required.
        </p>
        <p>
          For privacy questions or requests, contact Plurena at{" "}
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
