"use client";

import type { BidStatusResponse } from "@/lib/domain/types";
import { Check, Clock3, LoaderCircle, RefreshCw, TriangleAlert, Trophy } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ViewStatus = BidStatusResponse["status"] | "missing" | "error";

export function BidSuccessStatus() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<ViewStatus>(sessionId ? "pending" : "missing");
  const [result, setResult] = useState<BidStatusResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const readStatus = useCallback(async () => {
    if (!sessionId) return null;
    const response = await fetch(`/api/bid/status?session_id=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = (await response.json().catch(() => null)) as
      | (BidStatusResponse & { error?: string })
      | null;
    if (!response.ok || !data) {
      throw new Error(data?.error || data?.message || "We could not check this payment yet.");
    }
    return data;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const poll = async () => {
      try {
        const data = await readStatus();
        if (!active || !data) return;
        setResult(data);
        setMessage(data.message ?? null);
        setStatus(data.status);

        if (data.status === "pending") {
          attempts += 1;
          if (attempts < 40) {
            timer = setTimeout(poll, 1_500);
          } else {
            setStatus("error");
            setMessage("Confirmation is taking longer than expected. Your payment is not lost. Try checking again.");
          }
        }
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "We could not check this payment yet.");
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [readStatus, retryKey, sessionId]);

  const fulfilled = status === "fulfilled";
  const pending = status === "pending";
  const failed = status === "failed" || status === "expired" || status === "missing" || status === "error";

  return (
    <main id="main-content" className="flex flex-1 items-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-[620px] rounded-2xl border border-[#293038] bg-[#0e1114] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-10">
        <span
          className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${
            fulfilled
              ? "border-[#67e85f]/30 bg-[#67e85f]/10 text-[#67e85f]"
              : pending
                ? "border-white/10 bg-white/[0.04] text-[#c8ced3]"
                : "border-red-300/20 bg-red-300/[0.07] text-red-200"
          }`}
        >
          {fulfilled ? (
            <Check aria-hidden="true" size={27} strokeWidth={2.7} />
          ) : pending ? (
            <LoaderCircle aria-hidden="true" size={26} className="animate-spin" />
          ) : (
            <TriangleAlert aria-hidden="true" size={25} />
          )}
        </span>

        <p className={`mt-5 text-[11px] font-bold uppercase tracking-[0.13em] ${fulfilled ? "text-[#67e85f]" : pending ? "text-[#aab2ba]" : "text-red-200"}`}>
          {fulfilled ? "Bid confirmed" : pending ? "Checking payment" : "Needs attention"}
        </p>
        <h1 className="text-balance mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-[38px]">
          {fulfilled ? "Your bid was recorded." : pending ? "Checking your bid." : "We could not confirm this bid."}
        </h1>

        {fulfilled ? (
          <div className="mt-5">
            {result?.listing?.name ? (
              <p className="text-base text-[#c8ced3]">
                <span className="font-bold text-white">{result.listing.name}</span> has been updated successfully.
              </p>
            ) : null}
            {typeof result?.rank === "number" ? (
              result.rank <= 5 ? (
                <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-3 rounded-xl border border-[#67e85f]/20 bg-[#67e85f]/[0.055] px-4 py-4">
                  <Trophy aria-hidden="true" size={20} className="text-[#67e85f]" />
                  <span className="text-sm text-[#aab2ba]">
                    Current rank <strong className="tabular-nums ml-1 text-xl text-[#67e85f]">#{result.rank}</strong>
                  </span>
                </div>
              ) : (
                <div className="mx-auto mt-5 max-w-sm rounded-xl border border-white/10 bg-white/[0.035] px-4 py-4">
                  <p className="text-sm text-[#aab2ba]">
                    Current rank{" "}
                    <strong className="tabular-nums ml-1 text-xl text-white">#{result.rank}</strong>
                  </p>
                  <p className="mt-1 text-xs text-[#8f98a1]">The Top 5 are highlighted above all other rankings.</p>
                </div>
              )
            ) : null}
            {result?.rank == null && message ? (
              <p className="mt-4 text-sm leading-6 text-[#aab2ba]">{message}</p>
            ) : null}
            <p className="mt-5 text-sm leading-6 text-[#8f98a1]">
              Rankings remain competitive and can change whenever another payment succeeds.
            </p>
          </div>
        ) : pending ? (
          <div role="status" className="mt-5">
            <p className="text-sm leading-6 text-[#aab2ba]">
              Stripe has returned you to TopMySaaS. We are waiting for secure payment confirmation before changing the
              ranking.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#747e87]">
              <Clock3 aria-hidden="true" size={14} />
              This page checks automatically.
            </p>
          </div>
        ) : (
          <div role="alert" className="mt-5">
            <p className="text-sm leading-6 text-[#aab2ba]">
              {status === "missing"
                ? "This return link is missing its Stripe session ID. Open the link provided after checkout or return to the board."
                : status === "expired"
                  ? message || "This checkout session expired before payment was confirmed. No ranking change was made."
                  : status === "failed"
                    ? message || "The payment did not complete, so no ranking change was made."
                    : message || "The status service is temporarily unavailable. You can safely check again."}
            </p>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {status === "error" ? (
            <button
              type="button"
              onClick={() => {
                setStatus("pending");
                setMessage(null);
                setRetryKey((current) => current + 1);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-5 text-sm font-bold text-[#071006] transition-colors hover:bg-[#78f271]"
            >
              <RefreshCw aria-hidden="true" size={15} />
              Check again
            </button>
          ) : null}
          <Link
            href="/#leaderboard"
            className={`${fulfilled ? "bg-[#67e85f] text-[#071006] hover:bg-[#78f271]" : "border border-white/10 bg-white/[0.035] text-white hover:bg-white/[0.065]"} inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-bold transition-colors`}
          >
            View leaderboard
          </Link>
          {failed && status !== "error" ? (
            <Link
              href="/#bid"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-5 text-sm font-bold text-white transition-colors hover:bg-white/[0.065]"
            >
              Place a new bid
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
