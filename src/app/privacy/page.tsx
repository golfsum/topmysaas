export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <a href="/" className="text-green-400 text-sm hover:underline mb-8 inline-block">
          ← Back to TopMySaaS
        </a>
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-2">Information We Collect</h2>
            <p>
              When you place a bid we collect the product name, website URL, short
              description, and bid amount you provide. Payment details are processed
              by Stripe and are not stored on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">How We Use It</h2>
            <p>
              We use this information solely to display your listing on the public
              leaderboard and to process your payment. We do not sell personal data.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">Third Parties</h2>
            <p>
              Payments are handled by Stripe. Their privacy policy applies to payment
              data. We may use basic analytics to understand site usage.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">Contact</h2>
            <p>
              For privacy-related questions, contact the site operator via the domain
              contact information.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
