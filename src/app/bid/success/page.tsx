import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BidSuccessStatus } from "@/components/public/bid-success-status";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const metadata: Metadata = {
  title: "Bid Status | TopMySaaS",
  description: "Check payment confirmation and the resulting TopMySaaS rank.",
  robots: { index: false, follow: false },
};

function LoadingStatus() {
  return (
    <main id="main-content" className="flex flex-1 items-center px-4 py-12">
      <div className="mx-auto w-full max-w-[620px] rounded-2xl border border-white/10 bg-[#0e1114] p-8 text-center sm:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#67e85f]">
          Bid status
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
          Checking your payment.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#aab2ba]">
          Secure confirmation can take a moment. Keep this page open, or return to the leaderboard and check again from your checkout return link.
        </p>
        <noscript>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-amber-100">
            JavaScript is required for automatic status checks. Your payment record is still processed by the signed Stripe webhook.
          </p>
        </noscript>
        <Link
          href="/#leaderboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-5 text-sm font-bold text-white"
        >
          View leaderboard
        </Link>
      </div>
    </main>
  );
}

export default function BidSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col text-white">
      <SiteHeader />
      <Suspense fallback={<LoadingStatus />}>
        <BidSuccessStatus />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
