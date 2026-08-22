# TopMySaaS

TopMySaaS is a weekly SaaS leaderboard. Every active paid listing is ranked by the total amount successfully paid, the Top 5 are highlighted, and the active board resets every Monday at 00:00 UTC.

The public experience has no account system. Firebase Authentication is used only for the single configured administrator. Stripe Checkout collects payments, signed Stripe webhooks update Firestore, and an authenticated Vercel Cron job archives and closes each weekly board.

The temporary launch page is enabled by default. It keeps the full bid and payment flow active, counts down to August 24, 2026 at 00:00 UTC, and automatically switches to the complete leaderboard at that instant. The pre-launch board remains the opening live board through August 31, so every active paid listing and total carries into launch. Normal clearing resets begin August 31 and continue every Monday. Set `LAUNCH_MODE=false` only to open the complete leaderboard early.

## What is included

- Next.js 16 App Router application with TypeScript and Tailwind CSS
- Server-rendered public leaderboard with a 15-second refresh and live UTC countdown
- Highlighted Top 5 plus responsive rankings for every active paid listing
- Stripe Checkout creation, signed webhook fulfillment, and idempotent bid history
- Secure device token for same-device rebids that charge only the difference
- Atomic board generations that stop delayed webhooks from repopulating a reset board
- Firebase email/password admin login restricted to one configured UID
- Admin revenue overview, listing controls, bid activity, payment diagnostics, system error tracking, settings, and manual reset
- Aggregate outbound listing-click tracking with lifetime and per-board admin counts
- Authenticated 00:00 UTC Vercel Cron recovery check with one idempotent reset per weekly board and Top 5 archives
- Deny-all Firestore client rules and required composite indexes
- Terms, Privacy Policy, metadata, sitemap, robots, manifest, and generated social image
- Unit and Playwright browser tests for the critical public and admin entry flows

## Requirements

- Node.js 22
- npm 10 or newer
- A Firebase project with Firestore and Email/Password Authentication
- A Stripe account
- Firebase CLI access for Firestore rules and indexes
- A Next.js hosting environment that supports Route Handlers, such as Vercel

## Local setup

Install both application and Function dependencies:

```bash
npm ci
npm --prefix functions ci
```

Copy `.env.example` to `.env.local`, then fill in the values:

```bash
cp .env.example .env.local
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env.local
```

Start the application:

```bash
npm run dev
```

The default URL is `http://localhost:3000`.

For a UI-only preview, set `DEMO_MODE=true`. Preview data is clearly labeled and the server refuses real Checkout creation while demo mode is active.

The preview board contains only ClientPlot.com at $6 and AppsResolve.com at $5. To add those same two listings to the current Firestore board, configure Firebase credentials in `.env.local`, review the dry run, then seed once:

```bash
npm run seed:prelaunch -- --dry-run
npm run seed:prelaunch
```

The seed command also sets the current minimum bid to $5 and the minimum increment to $1. It is idempotent for the active weekly board and does not create payment-history records for the seeded amounts.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public and server | Canonical origin used for same-origin checks and Stripe return URLs |
| `LAUNCH_MODE` | Server | Enables the launch countdown until its fixed August 24 UTC cutover; set `false` only to open early |
| `DEMO_MODE` | Server | Enables labeled fixture data for local visual testing |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | Firebase browser SDK configuration for admin login |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public | Firebase browser app ID |
| `FIREBASE_PROJECT_ID` | Server | Firebase Admin project ID |
| `FIREBASE_CLIENT_EMAIL` | Server | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Server | Service account private key, with newlines encoded as `\n` |
| `FIREBASE_ADMIN_UID` | Server | The only Firebase Authentication UID permitted in `/admin` |
| `RATE_LIMIT_SALT` | Server | Random secret used to hash checkout rate-limit keys |
| `CRON_SECRET` | Server | Random secret Vercel uses to authenticate `/api/cron/weekly-reset` |
| `STRIPE_SECRET_KEY` | Server | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Server | Signing secret for the Checkout webhook endpoint |

On Google-managed infrastructure, Application Default Credentials can replace the explicit Firebase service account values. Keep every non-`NEXT_PUBLIC_` value server-only.

## Firebase setup

1. Create a Firebase project and enable Firestore in Native mode.
2. Enable Email/Password under Authentication.
3. Create the administrator user and copy its Firebase UID into `FIREBASE_ADMIN_UID`.
4. Create a server service account or configure Application Default Credentials.
5. Deploy rules and indexes from the repository root, targeting the intended project explicitly:

```bash
npm run firebase:deploy -- --project <firebase-project-id>
```

6. Wait until every composite index reports `READY` before enabling bidding or loading the admin dashboard:

```bash
npx firebase-tools firestore:indexes --project <firebase-project-id> --pretty
```

The production reset is configured in `vercel.json` and calls the authenticated `/api/cron/weekly-reset` route at 00:00 UTC each day. Its deterministic weekly reset ID makes Tuesday through Sunday successful no-ops after Monday completes, while also providing automatic catch-up attempts if Monday fails. Every invocation before August 31, 2026 preserves the extended opening board. The August 31 invocation performs the first clearing reset, and later Mondays use the normal weekly flow. Set a strong `CRON_SECRET` in Vercel Production before deploying. The `functions` package remains an optional Firebase scheduler fallback; do not deploy it while the Vercel Cron job is enabled. A successful index deployment starts an asynchronous build; queries can still fail until the required indexes are ready.

For local emulators, add these values to `.env.local`:

```dotenv
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099
```

Then run:

```bash
npm run firebase:emulators
```

## Stripe setup

TopMySaaS creates a one-time Checkout Session with inline price data for each variable bid. You do not need to create a Stripe Product, Price, Payment Link, publishable key, or client-side Stripe integration.

### Test mode

1. Create or select a Stripe sandbox and copy its `sk_test_...` secret into `STRIPE_SECRET_KEY` for the matching Vercel environment.
2. Configure Firebase and the other required variables before testing. Stripe fulfillment writes the paid bid to Firestore.
3. Deploy to a stable public HTTPS domain. A Vercel preview protected by login cannot receive Stripe webhook deliveries.
4. In Stripe Workbench, create an Account-scoped snapshot-event webhook destination at `https://topmysaas.com/api/stripe/webhook`.
5. Subscribe it to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
6. Copy that destination's test `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET` for the same Vercel environment.
7. Redeploy after saving the variables. Vercel environment changes do not update an existing deployment.
8. Place a test bid with card `4242 4242 4242 4242`, any future expiry date, and any three-digit CVC.
9. Confirm Stripe reports an HTTP 200 webhook delivery and Firestore contains the fulfilled Checkout Session, one bid document, and the updated listing total.

For local webhook testing:

```bash
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,payment_intent.payment_failed --forward-to http://localhost:3000/api/stripe/webhook
```

Use the temporary `whsec_...` value printed by the Stripe CLI in `.env.local`.

The success redirect never grants a rank. Only a paid Checkout Session received through a valid signed webhook can update the board. Session IDs are used as Firestore bid IDs, making repeated webhook deliveries harmless.

### Live mode

1. Finish Stripe account activation, payout-bank setup, two-factor authentication, public business details, and the statement descriptor.
2. Use separate production Firebase data rather than mixing sandbox bids with live revenue.
3. Create a live-mode webhook destination with the same URL and five events. Test and live webhook secrets are different.
4. Set the matching `sk_live_...` key and live `whsec_...` secret together in the Vercel Production environment.
5. Redeploy, complete one small real bid, and verify the Stripe delivery, Firestore records, leaderboard rank, and admin revenue before opening bidding broadly.

## Data model

Public business collections:

- `listings`: product details, integer-cent and compatibility dollar totals, UTC week, board generation, ownership hash, visibility, and timestamps
- `bids`: immutable paid increments, resulting totals, Stripe session and event IDs, application state, and timestamps

Operational collections:

- `bidIntents` and `checkoutSessions`: Checkout validation and fulfillment state
- `boardStates`: atomic generation counter and reset cutoff for each UTC week
- `listingClaims`: temporary same-URL Checkout reservation
- `listingTombstones`: current-week deletion barrier
- `checkoutRateLimits`: hashed abuse-control windows
- `systemEnvironments/{environment}/errorEvents`: sanitized payment, webhook, Firebase, admin, and server incidents isolated by deployment environment with a 90-day TTL
- `listingClickStats` and `boardClickStats`: aggregate lifetime and per-board outbound click counters (no per-click visitor records)
- `archives` and `resets`: prior Top 5 snapshots and reset execution records
- `settings/board`: minimum bid, minimum increment, reset close window, and currency

Money is calculated with integer cents. The requested `bidAmount` and `amount` dollar fields are stored only as compatibility mirrors.

## Verification

Run the core verification suite:

```bash
npm run verify
npm --prefix functions run build
npm audit --omit=dev
npm --prefix functions audit --omit=dev
```

Run desktop and mobile browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

Useful individual commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Production deployment

1. Deploy Firestore rules and indexes with `npm run firebase:deploy -- --project <firebase-project-id>`.
2. Confirm every required Firestore composite index reports `READY`.
3. Add every production environment variable to the Next.js host, including a strong `CRON_SECRET`.
4. Set `NEXT_PUBLIC_SITE_URL=https://topmysaas.com` and `DEMO_MODE=false`.
5. Deploy the Next.js application.
6. Register a separate live Stripe webhook and update both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` together.
7. Redeploy so the new Vercel environment values take effect.
8. Complete one small live bid and verify the listing, bid history, admin revenue, webhook delivery, and reset metadata in production Firestore.

Before accepting live money, have qualified counsel review the Terms and Privacy Policy for the operating entity, jurisdiction, contact details, tax treatment, and dispute requirements. The included copy implements the requested product protections but is not jurisdiction-specific legal advice.
