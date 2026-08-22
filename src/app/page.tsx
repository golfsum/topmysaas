"use client";

import { useState } from "react";

// Demo data — replace with Firestore later
const DEMO_LISTINGS = [
  {
    id: "1",
    name: "NexusFlow",
    url: "https://nexusflow.example",
    description: "AI workflow automation for modern teams",
    bidAmount: 247,
  },
  {
    id: "2",
    name: "LaunchKit",
    url: "https://launchkit.example",
    description: "Everything you need to launch and grow your SaaS",
    bidAmount: 189,
  },
  {
    id: "3",
    name: "DataStack",
    url: "https://datastack.example",
    description: "Sync and manage data across all your tools",
    bidAmount: 139,
  },
  {
    id: "4",
    name: "Metricly",
    url: "https://metricly.example",
    description: "Real-time analytics for data-driven teams",
    bidAmount: 97,
  },
  {
    id: "5",
    name: "MailScale",
    url: "https://mailscale.example",
    description: "Smart email campaigns that convert",
    bidAmount: 76,
  },
  {
    id: "6",
    name: "SecureLayer",
    url: "https://securelayer.example",
    description: "Security and compliance automation",
    bidAmount: 54,
  },
  {
    id: "7",
    name: "Flowkit",
    url: "https://flowkit.example",
    description: "No-code automation builder",
    bidAmount: 42,
  },
  {
    id: "8",
    name: "ChatLayer",
    url: "https://chatlayer.example",
    description: "AI customer support platform",
    bidAmount: 31,
  },
];

type Listing = (typeof DEMO_LISTINGS)[0];

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    description: "",
    bidAmount: 5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sorted = [...DEMO_LISTINGS].sort((a, b) => b.bidAmount - a.bidAmount);
  const top5 = sorted.slice(0, 5);
  const rest = sorted.slice(5);

  // Simple countdown to next Monday 00:00 UTC
  const getResetCountdown = () => {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday
    const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    const nextMonday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysUntilMonday,
        0,
        0,
        0
      )
    );
    const diff = nextMonday.getTime() - now.getTime();
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${d}d ${h}h`;
  };

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!form.name.trim() || !form.url.trim() || form.bidAmount < 5) {
      setError("Please fill all fields. Minimum bid is $5.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
      } else {
        // Demo fallback
        setError(
          "Stripe is not configured yet. Add your Stripe keys to enable real payments. (Demo mode)"
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#262626]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-green-500 flex items-center justify-center text-black font-bold text-sm">
              T
            </div>
            <span className="font-semibold text-lg tracking-tight">
              TopMySaaS
            </span>
          </div>
          <div className="text-sm text-zinc-400">
            Resets in <span className="text-green-400 font-medium">{getResetCountdown()}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Top 5 SaaS.
            <br />
            <span className="text-green-400">Ranked by bid.</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-6">
            Only five featured spots. Highest bid wins. Board resets every
            Monday. All bids are final.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-3 rounded-lg text-lg transition"
          >
            Place a Bid — from $5
          </button>
        </section>

        {/* Top 5 Featured */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-1 rounded">
              Featured
            </span>
            <h2 className="text-xl font-semibold">Top 5</h2>
          </div>

          <div className="space-y-3">
            {top5.map((item, i) => (
              <TopCard
                key={item.id}
                rank={i + 1}
                listing={item}
                onBid={() => {
                  setForm((f) => ({ ...f, bidAmount: item.bidAmount + 1 }));
                  setShowForm(true);
                }}
              />
            ))}
          </div>
        </section>

        {/* Full Rankings */}
        {rest.length > 0 && (
          <section className="mb-16">
            <h2 className="text-lg font-semibold text-zinc-400 mb-4">
              Full Rankings
            </h2>
            <div className="border border-[#262626] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#141414] text-zinc-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Bid</th>
                    <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((item, i) => (
                    <tr
                      key={item.id}
                      className="border-t border-[#262626] hover:bg-[#141414]/50"
                    >
                      <td className="px-4 py-3 text-zinc-500">#{i + 6}</td>
                      <td className="px-4 py-3">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:text-green-400 transition"
                        >
                          {item.name}
                        </a>
                        <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-xs">
                          {item.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-medium">
                        ${item.bidAmount}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <button
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              bidAmount: item.bidAmount + 1,
                            }));
                            setShowForm(true);
                          }}
                          className="text-xs text-zinc-400 hover:text-green-400 transition"
                        >
                          Outbid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Rules */}
        <section className="border border-[#262626] rounded-xl p-6 bg-[#0f0f0f] mb-12">
          <h3 className="font-semibold mb-3">How it works</h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li>• Rank is determined only by the total amount bid</li>
            <li>• Top 5 are featured. All other bids still appear in Full Rankings</li>
            <li>• You can raise your own bid anytime and only pay the difference</li>
            <li>• Board resets every Monday at 00:00 UTC</li>
            <li>• All bids are final and non-refundable</li>
            <li>• No login required. Spam and adult content will be removed</li>
          </ul>
        </section>

        {/* Footer legal blurb */}
        <footer className="text-center text-xs text-zinc-600 pb-10">
          <p className="mb-2">
            By placing a bid you agree that ranking is competitive and temporary.
            There is no guarantee of maintaining any position. We do not guarantee
            traffic or results.
          </p>
          <p>
            <a href="/terms" className="hover:text-zinc-400">
              Terms
            </a>{" "}
            ·{" "}
            <a href="/privacy" className="hover:text-zinc-400">
              Privacy
            </a>
          </p>
        </footer>
      </main>

      {/* Bid Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Place a Bid</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBid} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-green-500"
                  placeholder="My Awesome SaaS"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  required
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-green-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Short Description (max 120 chars)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-green-500"
                  placeholder="One sentence about your product"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Bid Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={5}
                    step={1}
                    required
                    value={form.bidAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bidAmount: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg pl-7 pr-3 py-2.5 text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">Minimum $5</p>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition"
              >
                {loading ? "Redirecting to Stripe…" : `Pay $${form.bidAmount} & Bid`}
              </button>

              <p className="text-xs text-zinc-500 text-center">
                All bids are final and non-refundable. Only the highest bids
                appear in Top 5 / Full Rankings.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TopCard({
  rank,
  listing,
  onBid,
}: {
  rank: number;
  listing: Listing;
  onBid: () => void;
}) {
  const isFirst = rank === 1;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${
        isFirst
          ? "border-green-500/40 bg-green-500/5"
          : "border-[#262626] bg-[#141414]"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 ${
          isFirst
            ? "bg-green-500 text-black"
            : "bg-[#1f1f1f] text-zinc-300"
        }`}
      >
        {rank}
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-green-400 transition"
        >
          {listing.name}
        </a>
        <p className="text-sm text-zinc-500 truncate">{listing.description}</p>
      </div>

      <div className="text-right shrink-0">
        <div className="text-green-400 font-bold text-lg">
          ${listing.bidAmount}
        </div>
        <button
          onClick={onBid}
          className="text-xs text-zinc-400 hover:text-green-400 transition mt-0.5"
        >
          Outbid →
        </button>
      </div>
    </div>
  );
}
