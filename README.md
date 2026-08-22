# TopMySaaS

Top 5 SaaS ranked by bid. Highest pays wins. Resets every Monday.

## Features

- Public leaderboard (no login)
- Featured Top 5 + Full Rankings below
- Bid form → Stripe Checkout
- $5 minimum bid
- Weekly reset messaging
- Terms & Privacy pages
- Dark mode, mobile responsive

## Quick Start

```bash
cd topmysaas
npm install
npm install stripe
npm run dev
```

Open http://localhost:3000

## Stripe Setup

1. Create a Stripe account and get your Secret Key
2. Create a `.env.local` file:

```
STRIPE_SECRET_KEY=sk_test_...
```

3. Restart the dev server

When a user places a bid, they are redirected to Stripe Checkout for the exact amount.

## Firebase (Next Step)

The current version uses demo data. To make rankings live:

1. Create a Firebase project + Firestore
2. Replace the DEMO_LISTINGS array in src/app/page.tsx with a Firestore query
3. On successful Stripe payment (webhook), write the new listing to Firestore

## Deploy to Vercel

Push to your GitHub repo, then connect it in the Vercel dashboard and add the environment variables.

## Notes

- All bids are final and non-refundable (stated clearly on the site)
- Only the highest bids appear in Top 5; lower bids still show in Full Rankings
- Admin dashboard is the next iteration
