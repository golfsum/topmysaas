# TopMySaaS

TopMySaaS is a weekly Top 5 SaaS leaderboard. Products are ranked only by the total amount successfully paid, and the active board resets every Monday at 00:00 UTC.

The public experience has no account system. Firebase Authentication is used only for the single configured administrator. Stripe Checkout collects payments, signed Stripe webhooks update Firestore, and a scheduled Firebase Function archives and closes each weekly board.

The temporary launch page is enabled by default. It keeps the full bid and payment flow active while presenting a focused launching-soon experience. Set `LAUNCH_MODE=false` to restore the complete leaderboard homepage without removing the launch page code.

## What is included

- Next.js 16 App Router application with TypeScript and Tailwind CSS
- Server-rendered public leaderboard with a 15-second refresh and live UTC countdown
- Five ranked positions with responsive table and card layouts
- Stripe Checkout creation, signed webhook fulfillment, and idempotent bid history
- Secure device token for same-device rebids that charge only the difference
- Atomic board generations that stop delayed webhooks from repopulating a reset board
- Firebase email/password admin login restricted to one configured UID
- Admin revenue overview, listing controls, bid activity, settings, and manual reset
- Monday 00:00 UTC scheduled reset with Top 5 archives
- Deny-all Firestore client rules and required composite indexes
- Terms, Privacy Policy, metadata, sitemap, robots, manifest, and generated social image
- Unit and Playwright browser tests for the critical public and admin entry flows

## Requirements

- Node.js 22
- npm 10 or newer
- A Firebase project with Firestore and Email/Password Authentication
- A Stripe account
- Firebase CLI access for rules, indexes, and scheduled Functions deployment
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
| `LAUNCH_MODE` | Server | Shows the temporary launching-soon homepage unless set to `false` |
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
| `STRIPE_SECRET_KEY` | Server | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Server | Signing secret for the Checkout webhook endpoint |

On Google-managed infrastructure, Application Default Credentials can replace the explicit Firebase service account values. Keep every non-`NEXT_PUBLIC_` value server-only.

## Firebase setup

1. Create a Firebase project and enable Firestore in Native mode.
2. Enable Email/Password under Authentication.
3. Create the administrator user and copy its Firebase UID into `FIREBASE_ADMIN_UID`.
4. Create a server service account or configure Application Default Credentials.
5. Deploy rules, indexes, and the scheduled Function together from the repository root:

```bash
npm run firebase:deploy
```

The deploy script includes both `firestore` and `functions`. The scheduled `weeklyBoardReset` Function uses `0 0 * * 1` with the `UTC` timezone.

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

1. Put the Stripe test secret key in `STRIPE_SECRET_KEY`.
2. Create a webhook endpoint at `https://topmysaas.com/api/stripe/webhook`.
3. Subscribe it to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
4. Put the endpoint signing secret in `STRIPE_WEBHOOK_SECRET`.

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the temporary `whsec_...` value printed by the Stripe CLI in `.env.local`.

The success redirect never grants a rank. Only a paid Checkout Session received through a valid signed webhook can update the board. Session IDs are used as Firestore bid IDs, making repeated webhook deliveries harmless.

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

1. Deploy Firestore rules, indexes, and Functions with `npm run firebase:deploy`.
2. Add every production environment variable to the Next.js host.
3. Set `NEXT_PUBLIC_SITE_URL=https://topmysaas.com` and `DEMO_MODE=false`.
4. Deploy the Next.js application.
5. Register the production Stripe webhook and update `STRIPE_WEBHOOK_SECRET`.
6. Complete one small test-mode bid and verify the listing, bid history, admin revenue, and reset metadata in Firestore.
7. Switch Stripe keys only after the full test-mode flow succeeds.

Before accepting live money, have qualified counsel review the Terms and Privacy Policy for the operating entity, jurisdiction, contact details, tax treatment, and dispute requirements. The included copy implements the requested product protections but is not jurisdiction-specific legal advice.
