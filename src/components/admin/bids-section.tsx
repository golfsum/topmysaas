import { ExternalLink, ReceiptText } from "lucide-react";

import { formatUsd } from "@/lib/domain/money";
import type { BidActivity } from "@/lib/domain/types";

function formatBidDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(isoDate));
}

export function BidsSection({ bids }: { bids: BidActivity[] }) {
  return (
    <section aria-labelledby="recent-bids-title" className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e85f]">
          Payment activity
        </p>
        <h1
          id="recent-bids-title"
          className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl"
        >
          Recent bids
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Successfully fulfilled Stripe bids, newest first. Session references are
          included for reconciliation.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1010]">
        {bids.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-white/8 bg-white/[0.018] text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th className="px-5 py-3.5 sm:px-6" scope="col">
                      Product
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Amount paid
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      New total
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Time
                    </th>
                    <th className="px-5 py-3.5 text-right sm:px-6" scope="col">
                      Stripe session
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {bids.map((bid) => (
                    <tr key={bid.id} className="transition hover:bg-white/[0.018]">
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-medium text-zinc-100">{bid.listingName}</p>
                        <p className="mt-1 font-mono text-[11px] text-zinc-600">
                          {bid.listingId}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-mono font-semibold text-[#86f27f] tabular-nums">
                        +{formatUsd(bid.amountCents, true)}
                      </td>
                      <td className="px-4 py-4 font-mono text-zinc-300 tabular-nums">
                        {formatUsd(bid.resultingTotalCents, true)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-400">
                        {formatBidDate(bid.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <span
                          className="inline-flex max-w-48 items-center gap-1.5 rounded-md border border-white/8 bg-black/20 px-2.5 py-1.5 font-mono text-[11px] text-zinc-500"
                          title={bid.stripeSessionId}
                        >
                          <span className="truncate">{bid.stripeSessionId}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-white/6 md:hidden">
              {bids.map((bid) => (
                <li key={bid.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {bid.listingName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatBidDate(bid.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold text-[#86f27f] tabular-nums">
                      +{formatUsd(bid.amountCents, true)}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/6 pt-3 text-xs">
                    <span className="text-zinc-500">Resulting total</span>
                    <span className="font-mono text-zinc-300 tabular-nums">
                      {formatUsd(bid.resultingTotalCents, true)}
                    </span>
                  </div>
                  <p
                    className="mt-3 truncate font-mono text-[10px] text-zinc-600"
                    title={bid.stripeSessionId}
                  >
                    {bid.stripeSessionId}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <ReceiptText className="mx-auto h-7 w-7 text-zinc-600" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-zinc-300">No bids recorded</p>
            <p className="mt-1 text-xs text-zinc-500">
              Fulfilled Stripe payments will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
