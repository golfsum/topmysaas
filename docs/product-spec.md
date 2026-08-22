# TopMySaaS product contract

Last updated: 2026-08-21

## Product promise

TopMySaaS is a public weekly leaderboard for SaaS makers who want a visible, competitive placement without creating an account. The five highest successfully paid totals are highlighted. Every ranking expires at Monday 00:00 UTC.

The core pain hypothesis is that small SaaS teams want a simple, transparent promotion surface without subscription setup, opaque editorial selection, or a long ad-buying workflow. This hypothesis is not yet market-validated. It would be disproved if qualified makers do not start a bid after understanding the rules, or if paid bidders do not value repeat weekly participation.

## Primary journey

1. A visitor understands the live Top 5 and reset time in the first viewport.
2. They choose a target position or open the bid form.
3. They submit a product name, HTTPS website, description of at most 120 characters, and desired new total.
4. The server validates the bid, determines whether the secure device token owns an existing listing, and calculates the amount due.
5. Stripe Checkout collects payment.
6. A verified Stripe webhook records the payment atomically, raises or creates the listing, and updates the ranking.
7. The return page reports the webhook-backed result and actual current rank.

Activation is a successfully fulfilled first bid. The target time to value is under three minutes and no more than one on-site form before Stripe Checkout.

## Scope

Required public routes are `/`, `/bid/success`, `/terms`, and `/privacy`. Required admin routes are `/admin/login` and `/admin`.

There are no public accounts. A high-entropy, device-bound management token allows a returning owner to raise the same listing while paying only the difference. Only its SHA-256 hash is stored. Cross-device recovery is intentionally not included because it would require a verified identity or recovery channel.

Stripe webhooks are authoritative. The browser success redirect never grants a rank. Money is stored as integer cents and mirrored as dollar numbers only for compatibility with the requested Firestore shape.

## Ranking and reset invariants

- Public ranking reads only active listings for the current UTC week and board generation, ordered by `bidAmountCents` descending with a deterministic creation-time tie break.
- Only the first five are presented as ranked placements.
- Every successful payment adds its verified amount to the listing total. Concurrent payments never overwrite already-paid value.
- Checkout sessions are bound to one week. New checkouts pause shortly before reset so a session cannot promise a new week with an old-week intent.
- Monday changes the computed week immediately, so stale listings cannot leak onto the new board even if the scheduler is delayed.
- Scheduled and manual resets advance an atomic board generation before archiving and deactivating the prior board. Delayed payment webhooks are recorded but cannot repopulate a closed generation.
- Deleting a listing creates a current-week tombstone, so an already-open Checkout Session cannot recreate it.

## Admin and security

Firebase email/password is used only to obtain an ID token for the configured admin UID. The server exchanges that token for an HTTP-only Firebase session cookie. Every admin page data access and mutation verifies the cookie and UID again. Public Firestore reads and writes are denied; the public leaderboard is a server-filtered response.

Admin features include revenue and bid totals, listing creation and editing, hide, delete, forced bid totals, manual reset, recent bid activity, and minimum-bid settings.

## Reliability targets

- Public leaderboard response target: p95 under 800 ms excluding a cold start.
- Checkout creation target: p95 under 2 seconds excluding Stripe degradation.
- Webhook fulfillment target: 99.9 percent completed within 30 seconds.
- Duplicate webhook deliveries must be harmless.
- Public pages remain usable with an explicit empty or unavailable state when Firebase is not configured.

## Analytics plan

The first-party event taxonomy is: `bid_opened`, `bid_submitted`, `checkout_created`, `checkout_returned`, `bid_fulfilled`, `bid_failed`, `listing_outbid`, and `weekly_reset`. No analytics vendor is wired by default. Payment and bid records provide the operational events needed for an initial dashboard without adding tracking scripts.

## Acceptance checks

- A production build, lint, typecheck, unit tests, and critical browser tests pass.
- The public page shows exactly five ranked or open slots and a live UTC countdown.
- Invalid or unsafe URLs, descriptions over 120 characters, and bids below settings are rejected on the server.
- Checkout is created only from a server-calculated amount.
- A signed, paid Stripe session is fulfilled exactly once in a Firestore transaction.
- Admin routes and mutations reject missing, expired, revoked, or wrong-UID sessions.
- Scheduled reset retries are idempotent, and every manual reset creates a new empty board generation.
- Desktop and mobile screenshots show no blocking clipping or unreachable controls.
