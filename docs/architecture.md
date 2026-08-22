# Architecture and scale path

Last updated: 2026-08-21

## Boundaries and ownership

TopMySaaS is a single public board, not a multi-tenant workspace. Public visitors own no server account. A random HTTP-only browser token proves same-device listing ownership; only its SHA-256 hash is stored. The single administrator is identified by an exact Firebase Authentication UID.

Firestore client access is denied. Every public read, payment write, and admin action goes through a Next.js server route or the scheduled Firebase Function. Stripe is authoritative for payment state, while Firestore is authoritative for ranking state.

## Critical flows

### Public read

1. The server computes the UTC `weekId` and reads its current `boardGeneration`.
2. Firestore returns at most five active listings for that exact week and generation, ordered by integer-cent total descending and creation time ascending.
3. The client refreshes the bounded response every 15 seconds and retains the most recent valid board during a transient failure.

### Checkout creation

1. The server verifies origin, schema, HTTPS URL, close window, settings, ownership, tombstone, current generation, URL claim, and a ten-minute hashed rate-limit window.
2. A Firestore transaction creates the bid intent and temporary URL claim.
3. The server calculates the amount due. Owned same-generation listings pay only `targetTotalCents - currentTotalCents`; new periods pay the full target.
4. Stripe Checkout receives only the server-calculated integer amount and minimal intent metadata.

### Payment fulfillment

1. The webhook verifies the raw Stripe signature, retrieves the canonical Checkout Session, and requires paid payment mode, USD currency, exact amount, and matching intent metadata.
2. A Firestore transaction uses the Stripe Session ID as the immutable bid ID.
3. The transaction re-reads board generation and deletion tombstone before it can activate a listing.
4. Duplicate deliveries return the existing result. A payment completed after reset is recorded for reconciliation but cannot re-enter the active board.

### Reset

The scheduled Function and manual admin action advance the board generation before deactivating prior listings. New reads and checkouts immediately use the new generation. The scheduled reset persists a running record and reuses its captured generation on retry, then archives the prior Top 5 and deactivates the prior generation with BulkWriter.

## Hot paths and resource bounds

- Public listing reads are bounded to five documents and covered by a composite index.
- Recent admin bid activity is bounded to 50 documents.
- Stripe webhook writes are transactional and idempotent per Checkout Session.
- Checkout attempts are limited to five starts per hashed address window, with a device-token fallback when no trusted forwarding header exists.
- Weekly reset uses one Function instance, three retries, a 300-second timeout, and BulkWriter.
- Revenue uses Firestore aggregation instead of loading every bid document.

## Failure domains

| Dependency | User-visible behavior | Recovery |
| --- | --- | --- |
| Firestore public read | Explicit unavailable or stale state; bid controls disabled when no valid board exists | User retry and 15-second polling |
| Stripe Checkout creation | Inline error; no payment taken | Bounded 15-second browser timeout and retry |
| Delayed Stripe webhook | Return page keeps checking; signed event retries remain idempotent | Stripe retry plus session-status polling |
| Reset retry | Captured generation is reused by the scheduled job | Function retry count and persistent reset status |
| Admin refresh after committed write | Dialog closes and warns that data has not reloaded | Manual dashboard refresh without repeating the mutation |

## Next scale threshold

The current design is appropriate for an early single-board product. Before roughly 5,000 active listings or 50,000 bids per week:

1. Paginate the admin listings view and historical bid activity.
2. Partition or queue reset deactivation work instead of loading the full generation into one Function invocation.
3. Add managed WAF limits in front of Checkout and status routes, not only Firestore rate windows.
4. Add structured logs, alerting for webhook age and reset failure, Firestore backup policy, and a restore drill.
5. Load-test concurrent first bids, rebids, reset cutoffs, and webhook retry order against a dedicated Firebase project.
6. Add an analytics sink for the documented activation and failure taxonomy with an explicit retention policy.
