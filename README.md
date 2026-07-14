# Plurena

Plurena runs text, image, and open-ended research with AI respondent panels. Users define an audience, launch a fixed-size panel, watch responses arrive through Convex subscriptions, and export the result as Markdown or PDF.

## Stack

- Next.js 16 App Router and TypeScript, deployed on Vercel
- Clerk with Google OAuth
- Convex Cloud for data, auth enforcement, file storage, scheduled jobs, provider calls, and live queries
- Creem one-time payments for credit top-ups
- Phosphor Icons and custom CSS
- Vitest for focused domain tests

The marketing page lives at `/`. `proxy.ts` protects `/dashboard`, `/tests/*`, and `/api/checkout`. Convex functions repeat every ownership check at the data boundary.

## Product rules

- Completing both checkbox-only onboarding questions awards $6 once.
- A 20-person panel costs $5.
- Panel sizes and prices live only in [`convex/lib/pricing.ts`](convex/lib/pricing.ts).
- Creem top-ups start at $10. Plurena has no subscription code.
- Launch and payment mutations use integer cents, atomic ledger writes, and idempotency keys.
- Compare tests accept two to five text or image options. Each respondent gets a stable, seeded option order.
- Image assignments use vision models only.
- Models and fallback routes live in [`convex/lib/modelRegistry.ts`](convex/lib/modelRegistry.ts) and match [`MODELS.md`](MODELS.md).
- Plurena records provider and model routing internally for operations; customer-facing queries do not return those fields.

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

On PowerShell, use `Copy-Item .env.example .env.local`.

### 2. Configure Clerk

1. Create a Clerk application.
2. Enable Google under **SSO connections**.
3. Disable password, email/SMS code or link, phone, username, passkeys, and every other social provider. Rendering a Google button alone does not make the tenant Google-only.
4. Use Clerk's development Google credentials locally. Add your own Google OAuth client in production and copy Clerk's redirect URI into Google Cloud.
5. Create a Clerk JWT template named `convex`. Keep its audience/application ID as `convex`.
6. Add these values to `.env.local`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
CLERK_WEBHOOK_FORWARD_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

The app uses one Clerk `<SignIn>` surface for new and returning Google users.
Register `https://your-public-host/api/webhooks/clerk` for Clerk's `user.deleted` event. Use the endpoint signing secret for `CLERK_WEBHOOK_SIGNING_SECRET`, and set the same random `CLERK_WEBHOOK_FORWARD_SECRET` in Vercel and the Convex deployment. Verified deletion events schedule an idempotent, batched erasure of the user row, research data, billing rows, and stored files; a five-minute cron resumes interrupted jobs.

### 3. Configure Convex

```bash
npx convex dev
```

Choose or create a project. Convex writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`, deploys the schema, and generates the typed `convex/_generated` API. Keep those generated bindings current with `npm run convex:check`.

Copy the issuer from the Clerk `convex` JWT template, then set the Convex environment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-issuer
npx convex env set PAYMENT_WEBHOOK_FORWARD_SECRET replace-with-a-long-random-value
npx convex env set CLERK_WEBHOOK_FORWARD_SECRET replace-with-another-long-random-value
npx convex env set OPENROUTER_API_KEY your-key
npx convex env set OPENROUTER_SITE_URL http://localhost:3000
npx convex env set OPENROUTER_APP_NAME Plurena
```

Add OpenCode Go when its OpenAI-compatible application endpoint and commercial terms are confirmed:

```bash
npx convex env set OPENCODE_GO_API_KEY your-key
npx convex env set OPENCODE_GO_BASE_URL https://your-approved-endpoint/v1
npx convex env set OPENCODE_GO_ALLOWED_HOSTS api.your-approved-endpoint.example
```

`OPENCODE_GO_BASE_URL` is configuration because the supplied model specification does not define a stable endpoint. If the key or URL is absent, assignments continue through each model's OpenRouter fallback. If both routes fail, Plurena tries another eligible model.

Optional action tuning:

```bash
npx convex env set AI_REQUEST_TIMEOUT_MS 45000
npx convex env set AI_MAX_RETRIES 1
```

### 4. Configure Creem

Create one **one-time** USD product priced at $10. Plurena uses product units for the supported $10, $20, $50, and $100 top-ups. Confirm unit quantities on a Creem test checkout before enabling production mode.

Add to `.env.local` and Vercel:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
CREEM_API_KEY=
CREEM_WEBHOOK_SECRET=
CREEM_TOPUP_PRODUCT_ID=
CREEM_TEST_MODE=true
PAYMENT_WEBHOOK_FORWARD_SECRET=the-same-long-random-value-used-in-convex
```

Register this webhook in the Creem test dashboard:

```text
https://your-public-host/api/webhooks/creem
```

The route reads the raw body, verifies the `creem-signature` HMAC-SHA256 value with a timing-safe comparison, validates `checkout.completed`, checks product, paid status, amount, and currency, then forwards the event to one atomic Convex mutation. Convex deduplicates the event and ledger entry. The success redirect never grants credit.

Use a tunnel for local webhook testing. Set `CREEM_TEST_MODE=false` only after creating and testing the live product and webhook.

### 5. Start

Run Convex and Next.js in separate terminals:

```bash
npx convex dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Runtime | Required | Purpose |
|---|---|---:|---|
| `NEXT_PUBLIC_APP_URL` | Vercel/browser | Yes | Canonical origin and Creem return URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel/browser | Yes | Clerk frontend key |
| `CLERK_SECRET_KEY` | Vercel | Yes | Clerk server key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Vercel | Yes | Verifies Clerk lifecycle webhooks |
| `CLERK_WEBHOOK_FORWARD_SECRET` | Vercel + Convex | Yes | Authenticates deletion requests forwarded to Convex |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel/browser | Yes | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | Local CLI | Local | Selected Convex deployment |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Yes | Clerk issuer for the `convex` JWT template |
| `CREEM_API_KEY` | Vercel | Billing | Checkout API key |
| `CREEM_WEBHOOK_SECRET` | Vercel | Billing | Webhook HMAC secret |
| `CREEM_TOPUP_PRODUCT_ID` | Vercel | Billing | Allowlisted $10 one-time product |
| `CREEM_TEST_MODE` | Vercel | Billing | Uses Creem test API unless set to `false` |
| `PAYMENT_WEBHOOK_FORWARD_SECRET` | Vercel + Convex | Billing | Authenticates the verified webhook handoff |
| `OPENCODE_GO_API_KEY` | Convex | Optional | OpenCode Go provider key |
| `OPENCODE_GO_BASE_URL` | Convex | Optional | Approved OpenAI-compatible endpoint root |
| `OPENCODE_GO_ALLOWED_HOSTS` | Convex | Optional | Comma-separated HTTPS host allowlist for that endpoint |
| `OPENROUTER_API_KEY` | Convex | AI | OpenRouter provider key |
| `OPENROUTER_SITE_URL` | Convex | AI | OpenRouter attribution URL |
| `OPENROUTER_APP_NAME` | Convex | Optional | OpenRouter attribution name |
| `AI_REQUEST_TIMEOUT_MS` | Convex | Optional | Per-request timeout, default 45 seconds and capped at 60 |
| `AI_MAX_RETRIES` | Convex | Optional | Retry count per route, default 1 and capped at 2 |

Keep provider, Clerk secret, Creem, and webhook keys out of `NEXT_PUBLIC_*` variables.

## Deploy

1. Push the repository to a Git provider.
2. Create separate production Clerk, Convex, Creem, OpenRouter, and approved OpenCode credentials.
3. Run `npx convex deploy` and set every Convex variable listed above on the production deployment.
4. Import the repository in Vercel and add the Vercel variables from `.env.example`.
5. Deploy. Vercel detects Next.js automatically.
6. Add the production domain to Clerk and provider allowlists.
7. Register `https://your-domain/api/webhooks/creem` in Creem live mode.
8. Register `https://your-domain/api/webhooks/clerk` for Clerk `user.deleted` events and test one deletion.
9. Run one $10 payment, replay its signed event, and confirm one `payments` row, one positive `creditLedger` row, and one balance increase.
10. Launch a 20-person staging test. Confirm live counts, at least one stored model attempt, aggregation, synthesis, same-panel rerun, Markdown copy, and PDF export.

Vercel environment changes apply to new deployments, so redeploy after changing a key.

## Backend flow

1. `tests.launch` authenticates the Clerk identity, recalculates the quote, checks ownership of image assets, blocks a short balance, writes the test/options/personas/assignments/ledger entry, and schedules respondent actions in one Convex mutation.
2. Each action loads one persona, sends options in that respondent's stable randomized order, and cycles through the requested model route, its fallback, then one other eligible model's routes. A six-call budget caps retries and fallback spend.
3. Zod validates provider JSON before `testInternals.finishAssignment` stores the response. Every attempt records status, route, latency, and safe error data.
4. Convex subscriptions update completed/failed counts on the dashboard and detail page.
5. After every assignment reaches a terminal state, Convex creates the aggregate and schedules a separate synthesis action.
6. The synthesis prompt in [`convex/lib/synthesisGuidance.ts`](convex/lib/synthesisGuidance.ts) carries the relevant Stop Slop rules. The model scores directness, rhythm, trust, authenticity, and density, then revises a draft below 35/50. A bounded, stratified evidence builder keeps large panels within a fixed prompt budget and records how many responses were omitted from the synthesis prompt.

## Data model

[`convex/schema.ts`](convex/schema.ts) defines users, onboarding answers, credit ledger entries, payments, saved audiences, owned assets, tests, options, personas, assignments, responses, model attempts, aggregates, and syntheses. Public functions derive the user from `ctx.auth`; browser calls never provide an owner ID.

The same-panel rerun copies the original persona attributes into the new test and records each source persona. A normal rerun calls the panel generator again.

## Validation

```bash
npm run convex:check
npm run validate
npm audit
```

The test suite covers pricing, credit and payment idempotency, ownership, real-schema synthesis persistence, a 250-person launch under Convex transaction limits, panel distribution, option randomization, aggregation ties, synthesis evidence limits, model routing, and checkout URL boundaries. `.github/workflows/ci.yml` runs the local validation suite and can run Convex code generation when `CONVEX_DEPLOY_KEY` is configured.

Live Clerk, Creem, and AI-provider end-to-end tests still require sandbox credentials.

## Known integration gates

- Confirm the OpenCode Go base URL, quotas, and commercial panel use before production traffic. The adapter fails over when the provider is absent.
- Verify Creem's current `checkout.completed` payload in test mode against the pinned request validator before taking live payments. Creem's SDK and webhook payloads have changed over time.
- AI respondents can make mistakes. Plurena keeps disagreement, failed assignments, and None-of-the-above responses visible so researchers can judge the evidence while provider and model identities remain internal.
- Confirm provider data-processing terms, retention controls, and spend caps. Plurena discloses in the launch review that OpenCode Go or OpenRouter fallbacks receive study material and persona context.
- The $6 promotion is atomic per account and capped globally at 20 claims/$120 per UTC day. Keep Clerk bot protection and provider hard spend limits enabled, and monitor account and launch velocity.
