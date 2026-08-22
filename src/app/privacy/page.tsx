import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | TopMySaaS",
  description: "How TopMySaaS handles information used to process bids and operate the leaderboard.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="We collect only the information needed to process bids, publish product listings, protect the service, and keep payment records. We do not sell personal data."
    >
      <section>
        <h2>1. Information we collect</h2>
        <ul className="list-disc pl-5 marker:text-[#67e85f]">
          <li>
            <strong>Product details:</strong> the product name, website URL, short description, and bid total you submit.
          </li>
          <li>
            <strong>Payment records:</strong> payment status, amount, timestamps, and Stripe checkout or transaction
            identifiers needed to confirm a bid and maintain history.
          </li>
          <li>
            <strong>Checkout information:</strong> Stripe may collect contact and payment information directly from you
            to process payment. We do not store full payment card numbers.
          </li>
          <li>
            <strong>Basic service data:</strong> standard request details needed for security, fraud prevention, and
            reliable operation.
          </li>
          <li>
            <strong>Listing ownership token:</strong> a random secure token may be stored in this browser so a later bid
            can prove ownership and charge only the increase. It does not contain card details.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <p>
          We use this information to create and rank listings, process and verify bids, charge only the appropriate
          increase for a listing verified by a secure device token, reset the weekly board, prevent abuse, resolve
          payment issues, and operate the admin dashboard.
        </p>
      </section>

      <section>
        <h2>3. Public listing information</h2>
        <p>
          Product names, website URLs, descriptions, bid totals, and ranks are public while a listing is displayed.
          Do not submit personal or confidential information in product fields.
        </p>
      </section>

      <section>
        <h2>4. Service providers</h2>
        <p>
          We use Stripe to process payments and Firebase to store application data and provide administrative
          authentication. These providers process information as needed to deliver their services and apply their own
          privacy and security terms. We do not sell or rent personal data.
        </p>
      </section>

      <section>
        <h2>5. Retention and security</h2>
        <p>
          We retain listing and bid records for as long as reasonably needed to operate the leaderboard, maintain
          transaction history, prevent fraud, and meet legal or accounting obligations. We use reasonable technical and
          administrative safeguards, but no online system can guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>6. Your choices</h2>
        <p>
          You can choose not to place a bid. Public listings may also be removed when they violate the Terms. Payment
          records may need to remain for transaction, fraud prevention, or legal purposes even after a listing is no
          longer active.
        </p>
      </section>

      <section>
        <h2>7. Related terms</h2>
        <p>
          Review the <Link href="/terms">Terms</Link> for the bidding, ranking, reset, moderation, and refund rules that
          apply when you place a bid.
        </p>
      </section>
    </LegalPage>
  );
}
