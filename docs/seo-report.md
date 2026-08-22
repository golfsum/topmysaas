# SEO report

Research date: 2026-08-21

## Audience and intent

The primary audience is an indie SaaS founder or small growth team looking for a fast, transparent way to place a product in front of discovery traffic. The primary conversion is a completed bid. Search language clusters are:

- High intent: “bid to rank SaaS,” “paid SaaS leaderboard,” “promote my SaaS,” and “featured SaaS listing”
- Problem aware: “where to promote a SaaS,” “get first SaaS users,” and “SaaS launch directories”
- Informational: “how SaaS leaderboards work” and “weekly SaaS leaderboard”

The home page targets the specific live weekly leaderboard intent. Terms and privacy each serve their own legal intent. No thin keyword pages are included.

## Current market snapshot

- [OutbidRank](https://outbidrank.com/) uses bid decay, permanent records, categories, and more than five available positions.
- [PeerPush Outbid](https://peerpush.com/outbid?source=outbid_nav) stacks paid bids for a rolling 30-day period and adds analytics and a broader product-discovery ecosystem.
- [StartupRanked](https://startupranked.com/) organizes scheduled Monday launches and a wider SaaS discovery leaderboard.
- [SaaSLineup](https://saaslineup.com/submit/) sells directory placements and asks for a multi-step submission with email and category data.

TopMySaaS stays deliberately narrower: exactly five highlighted positions, a fixed Monday UTC reset, ranking from successful dollars only, and no public account. The differentiation is visible in the first viewport and the purchase flow, not hidden in marketing copy.

This is a competitive snapshot, not proof of customer demand. No traffic, ranking, backlink, or business-result claim is made.

## Technical implementation

- Descriptive title, unique page descriptions, one canonical production origin, and server-rendered core copy
- Open Graph and X metadata with an original generated social card
- Root sitemap containing only canonical public pages
- Robots policy that keeps admin, API, and payment-status routes out of crawl paths
- Responsive public routes with semantic headings, table markup on desktop, and descriptive link text
- `WebSite` structured data is limited to visible, verifiable product facts
- User-submitted product links use `sponsored`, `nofollow`, `noopener`, and `noreferrer`

The choices follow current [Google Search SEO guidance](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) for useful visible content and descriptive titles, [canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/canonicalization), and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Remaining production checks

- Verify the deployed HTTPS canonical and redirect any alternate host to it.
- Submit the production sitemap in Search Console.
- Run URL Inspection after launch and confirm the rendered page matches the public experience.
- Measure real Core Web Vitals after deployment and revise only from observed field data.
