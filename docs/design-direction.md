# Design direction

The supplied image is a style target, not a source of product behavior or copy. Browser chrome, monthly pricing language, click counts, a sixth row, and public sign-in are intentionally excluded.

## Visual system

TopMySaaS uses a dense auction-board composition on a near-black canvas. Green is reserved for live status, paid totals, focus, and primary action. Neutral surfaces, thin cool borders, tabular numerals, and compact labels keep the leaderboard credible and operational rather than decorative.

The primary content width is 1200 pixels, while the hero and board sit in a focused 900-pixel column. The first viewport contains the reset state, exact headline, featured leader, and the beginning of the five positions. The desktop ranking is a semantic table. Small screens receive ranked cards that retain every required field and action.

Typography uses Geist Sans and Geist Mono from the framework-managed font package. The display size scales from 38 pixels on phones to 56 pixels on wide screens. Buttons and fields keep a 44-pixel minimum target. Motion is limited to dialog entrance, live status, and short row updates, and is removed when reduced motion is requested.

The logo is an original CSS bar mark. Product marks are deterministic monograms generated from text and a fixed accessible palette. No third-party visual assets are shipped.

## Interaction rules

- The primary action is always “Place a bid.”
- Position buttons prefill the smallest allowed total that would clear the selected amount at that instant.
- The bid form is a centered native dialog on desktop and a keyboard-safe bottom sheet on mobile.
- Checkout cancellation preserves the public context and shows a calm status notice.
- Payment return stays in a confirming state until the webhook-backed intent is fulfilled.
- Website links open in a new tab with safe relationship attributes.
- Empty, partial, live, reconnecting, validation, payment, and hidden-listing states are explicit.
