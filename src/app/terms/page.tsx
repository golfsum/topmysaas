export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <a href="/" className="text-green-400 text-sm hover:underline mb-8 inline-block">
          ← Back to TopMySaaS
        </a>
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-2">1. Bidding</h2>
            <p>
              All bids placed on TopMySaaS are final and non-refundable. By submitting
              a bid and completing payment, you acknowledge that you are paying for
              the opportunity to appear on the public ranking based solely on the
              amount bid.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">2. Ranking</h2>
            <p>
              Rank is determined exclusively by the total amount successfully bid.
              There is no guarantee that your listing will appear in the Top 5 or
              maintain any specific position. Your listing can be outbid at any time
              and may lose its rank immediately.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">3. Weekly Reset</h2>
            <p>
              The leaderboard resets every Monday at 00:00 UTC. All rankings are
              cleared. Previous positions do not carry over.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">4. Content</h2>
            <p>
              We reserve the right to remove any listing that is spam, misleading,
              adult, illegal, or otherwise violates these terms, without refund.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">5. No Guarantees</h2>
            <p>
              TopMySaaS does not guarantee traffic, clicks, leads, sales, or any
              business results from appearing on the leaderboard. Ranking is a
              competitive visibility mechanism only.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">6. Acceptance</h2>
            <p>
              By placing a bid you confirm that you have read, understood, and agree
              to these terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
