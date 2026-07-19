# Plurena

Plurena is a production-oriented marketing validation application. Users define an audience, compare text or image concepts, and receive directional feedback from a panel of distinct synthetic respondents. It is built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, Clerk, Convex Cloud, AI SDK 6, OpenCode Go/OpenRouter, Creem, and Vercel.

Synthetic research is presented as decision support, not a substitute for real customer evidence. Reports persist exact vote statistics separately from model-written interpretation, and every report includes this limitation.

## What is implemented

- Public light-mode marketing site and responsive Notion-inspired application shell
- Clerk sign-up, sign-in, session management, protected routes, and Convex identity integration
- One-time $6 onboarding credit with an append-only, integer-cent ledger
- Draftable four-step test builder for reorderable text and private image options
- Server-owned respondent tiers and pricing: 20/$5, 50/$10, 75/$14, 100/$18, 150/$25, 200/$33, and 250/$40
- Immutable test snapshots and atomic, idempotent launch charging
- Convex-managed persona batches, bounded respondent execution, leases, retry recovery, live progress, and hierarchical synthesis
- All ten models from `models.md`, with centralized vision-aware routing, primary/backup providers, timeouts, limited retries, and error classification
- Structured and server-validated personas, respondent decisions, synthesis groups, and final narratives
- Deterministic rankings, vote percentages, confidence distributions, ties, and result-strength labels
- Persisted structured and readable reports, individual response search/filtering, and persona detail views
- Private Convex file storage with ownership, content-type, and 8 MB server validation
- Creem quantity checkout, signed webhooks, replay protection, idempotent credits, success/cancel views, and transaction history
- Light/dark theme persistence, skeleton/empty/error states, accessible labels and focus treatment, and responsive layouts

## Architecture

The browser never receives provider, payment, or webhook credentials. Clerk authenticates the workspace and supplies a Convex JWT. Convex owns application data, storage, authorization, pricing, job state, scheduling, and financial transactions.

Launching a draft performs one Convex transaction: authorize owner, validate options and server price, verify funds, create an immutable snapshot, debit the cached balance, append the unique ledger charge, and enqueue the first persona batch. Persona generation uses GLM-5.2 in batches of 20. Once the exact requested panel exists, respondent runs execute with concurrency five. Each run has a lease, a unique persona, bounded retries, and a one-response-per-run index.

Completed responses are grouped in batches of 25 for GLM-5.2 synthesis. The final action receives bounded group summaries plus exact deterministic aggregates. The final mutation persists both structured fields and a readable report. A two-minute cron reclaims expired leases.

Financial updates always mutate the cached balance and append a ledger record in the same transaction. Checkout credits use unique Creem checkout keys. Test charges use unique test keys. No model work begins before a successful charge.

### Failure and refund policy

- If persona construction ultimately fails, no respondent work occurred and the complete charge is refunded once.
- Individual respondent work retries up to three attempts for legitimate transient failures.
- A completed or partially completed panel receives a proportional integer-cent refund for permanently failed respondents.
- If every respondent fails, the full test charge is refunded.
- A failed narrative-generation call falls back to an honest deterministic report based on stored responses; it never invents a successful AI synthesis.

## Local setup

Requirements: Node.js 20 or newer, a Convex account, a Clerk application, one Creem $5 one-time product, and at least one configured inference provider.

1. Install dependencies.

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set the browser/server Clerk values. `NEXT_PUBLIC_CONVEX_URL` is written by the Convex CLI when a deployment is configured.

3. In Clerk, enable the Convex integration/JWT template. Set its issuer domain in Convex Cloud:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-domain.clerk.accounts.dev
   ```

4. Configure the remaining backend-only variables in the same Convex deployment:

   ```bash
   npx convex env set OPENCODE_GO_API_KEY your_key
   npx convex env set OPENROUTER_API_KEY your_key
   npx convex env set CREEM_API_KEY your_key
   npx convex env set CREEM_WEBHOOK_SECRET your_secret
   npx convex env set CREEM_PRODUCT_ID prod_your_five_dollar_product
   npx convex env set CREEM_API_BASE_URL https://test-api.creem.io
   npx convex env set APP_URL http://localhost:3000
   ```

   One model provider may be omitted for local work. Routes without credentials are skipped; production should configure both so documented provider fallback is available.

5. Push functions and run both development processes:

   ```bash
   npx convex dev --once
   npm run dev
   ```

The current development deployment is `arham-saigol/plurena` at `https://accurate-rook-702.eu-west-1.convex.cloud`.

## Creem setup

Create one one-time product priced at exactly $5 and set its ID as `CREEM_PRODUCT_ID`. Point the Creem webhook at:

```text
https://<your-convex-site-domain>/creem/webhook
```

The site-domain value is printed by the Convex CLI and stored locally as `NEXT_PUBLIC_CONVEX_SITE_URL`. Subscribe to `checkout.completed` and copy the webhook signing secret into `CREEM_WEBHOOK_SECRET`. Use `https://test-api.creem.io` in development and `https://api.creem.io` in production. The browser return URL is `/app/billing/success?session=<request-id>`; `/app/billing/cancel` provides the canceled-checkout experience.

## Vercel deployment

1. Create a production Convex deployment and generate its deploy key.
2. In Vercel, set `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_APP_URL`.
3. Use `npx convex deploy --cmd 'npm run build'` as the Vercel build command. Convex supplies the production URL while building the Next.js app.
4. Set every backend-only variable listed above on the production Convex deployment, with `APP_URL` set to the canonical Vercel domain and the production Creem API base.
5. Add the Vercel domain to Clerk and update Creem's webhook/redirect configuration for production.

Never put AI, Creem, or webhook secrets in Vercel variables prefixed with `NEXT_PUBLIC_`.

## Commands

```bash
npm run dev          # Convex and Next.js together
npm run dev:web      # Next.js only
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check        # typecheck + lint + tests
```

The test suite covers authoritative pricing, aggregation and refund math, model routing and fallback classification, structured-output validation, user isolation, onboarding ledger idempotency, atomic launch charging, Creem webhook replay protection, and duplicate respondent completion.

## External-service validation

The repository contains no pretend payment or model-success path. A full paid test requires real Clerk browser keys, Creem test credentials/product/webhook, and inference keys in Convex Cloud. Without those values, the public site remains usable and the protected app shows explicit configuration guidance; payment and inference actions fail safely instead of simulating success.
