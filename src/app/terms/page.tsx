import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Terms | TopMySaaS",
  description: "Terms for bidding on the TopMySaaS weekly leaderboard.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms"
      intro="These terms explain the competitive, temporary nature of the TopMySaaS leaderboard. Read them before placing a bid."
    >
      <section>
        <h2>1. The essential bidding terms</h2>
        <ul className="list-disc pl-5 marker:text-[#67e85f]">
          <li>
            <strong>Bidding is final. All payments are non-refundable.</strong>
          </li>
          <li>
            Rank is determined solely by the total amount successfully bid. There is no guarantee of maintaining any
            position.
          </li>
          <li>Your listing can be outbid at any time and may lose its rank immediately.</li>
          <li>The Top 5 board resets every Monday at 00:00 UTC. All rankings are cleared.</li>
          <li>
            We reserve the right to remove any listing that is spam, misleading, adult, illegal, or violates these
            terms, without refund.
          </li>
          <li>
            We do not guarantee traffic, clicks, leads, or any business results from appearing on the leaderboard.
          </li>
          <li>By placing a bid you acknowledge that ranking is competitive and temporary.</li>
        </ul>
      </section>

      <section>
        <h2>2. How ranking works</h2>
        <p>
          Active listings are ordered by their total amount successfully paid for the current weekly board. The five
          highest totals are displayed publicly. A higher successful bid can change positions immediately. If you
          increase the total for an existing listing, the checkout charge is the difference between its current total
          and the new total accepted at checkout, only when the listing is verified by the secure ownership token on
          that device. A matching URL alone does not prove ownership.
        </p>
        <p className="mt-3">
          If two listings have the same successfully paid total, the listing that reached the board earlier stays
          ahead. The listing ID provides a final deterministic tie break if their timestamps are also equal.
        </p>
        <p className="mt-3">
          A checkout session does not reserve a position. Your final rank is based on the board after payment succeeds
          and is recorded. Other bids may complete before or after yours.
        </p>
      </section>

      <section>
        <h2>3. Weekly reset</h2>
        <p>
          The active leaderboard resets every Monday at 00:00 UTC. Amounts paid during one board do not carry into the
          next board. A prior listing must place a new bid to compete again after a reset.
        </p>
      </section>

      <section>
        <h2>4. Listing standards</h2>
        <p>
          You may submit only product information and website URLs you have the right to use. Listings must be accurate,
          lawful, and suitable for a general audience. We may edit, hide, or remove content that violates these terms or
          threatens the site, its visitors, or other products. Removal does not create a right to a refund.
        </p>
      </section>

      <section>
        <h2>5. Payments</h2>
        <p>
          Payments are processed by Stripe. A bid counts only after payment is successfully completed and confirmed.
          Failed, canceled, expired, disputed, or reversed payments do not create a valid ranking entitlement. You are
          responsible for reviewing the product details and new total before completing checkout.
        </p>
      </section>

      <section>
        <h2>6. Service availability</h2>
        <p>
          We may maintain, change, pause, or discontinue features when needed. We work to keep ranking information
          current, but brief processing or network delays can occur. Nothing on TopMySaaS is a promise of advertising
          performance, search ranking, endorsement, or commercial results.
        </p>
      </section>

      <section>
        <h2>7. Privacy</h2>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> describes the limited information used to process bids and
          operate the leaderboard.
        </p>
      </section>
    </LegalPage>
  );
}
