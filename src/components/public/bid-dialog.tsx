"use client";

import type { BoardSettings, CheckoutRequest, CheckoutResponse } from "@/lib/domain/types";
import { Gavel, LoaderCircle, LockKeyhole, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from "react";

export type BidTarget = {
  rank?: number;
  minimumTotalCents: number;
  initialTotalCents?: number;
};

type BidDialogProps = {
  open: boolean;
  settings: BoardSettings;
  target: BidTarget;
  onClose: () => void;
};

type BidForm = {
  name: string;
  url: string;
  description: string;
  amount: string;
};

const initialForm: BidForm = {
  name: "",
  url: "",
  description: "",
  amount: "",
};

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function initialAmount(target: BidTarget) {
  const cents = Math.max(
    target.minimumTotalCents,
    target.initialTotalCents ?? target.minimumTotalCents,
  );
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function BidDialog({ open, settings, target, onClose }: BidDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const amountHelpId = useId();
  const [minimumTotalCents, setMinimumTotalCents] = useState(
    target.minimumTotalCents,
  );
  const [form, setForm] = useState<BidForm>(() => ({
    ...initialForm,
    amount: initialAmount(target),
  }));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const updateField = (field: keyof BidForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError(null);
  };

  const close = () => {
    if (submitting) return;
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    } else {
      onClose();
    }
  };

  const handleBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const targetTotalCents = Math.round(Number(form.amount) * 100);
    if (!Number.isFinite(targetTotalCents) || targetTotalCents < minimumTotalCents) {
      setError(`Enter a new total of at least ${dollars(minimumTotalCents)}.`);
      return;
    }

    let url: string;
    try {
      url = new URL(normalizeUrl(form.url)).toString();
    } catch {
      setError("Enter a valid website URL.");
      return;
    }

    const request: CheckoutRequest = {
      name: form.name.trim(),
      url,
      description: form.description.trim(),
      targetTotalCents,
      ...(target.rank ? { targetRank: target.rank } : {}),
    };

    setSubmitting(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as
        | (Partial<CheckoutResponse> & {
            error?: string;
            message?: string;
            details?: { requiredTargetCents?: number };
          })
        | null;

      if (!response.ok || !data?.checkoutUrl) {
        const requiredTargetCents = data?.details?.requiredTargetCents;
        if (
          Number.isSafeInteger(requiredTargetCents) &&
          requiredTargetCents !== undefined &&
          requiredTargetCents > minimumTotalCents
        ) {
          setMinimumTotalCents(requiredTargetCents);
          setForm((current) => ({
            ...current,
            amount: (requiredTargetCents / 100).toFixed(
              requiredTargetCents % 100 === 0 ? 0 : 2,
            ),
          }));
        }
        throw new Error(data?.error || data?.message || "Checkout could not be started. Please try again.");
      }

      window.location.assign(data.checkoutUrl);
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? "Checkout took too long to respond. No payment was taken. Please try again."
          : caught instanceof Error
            ? caught.message
            : "Checkout could not be started. Please try again.",
      );
      setSubmitting(false);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const inputClass =
    "mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#090c0f] px-3.5 text-[15px] text-white placeholder:text-[#74808a] transition-colors hover:border-white/20 focus:border-[#67e85f]/60 focus:outline-none";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onCancel={(event) => {
        if (submitting) event.preventDefault();
      }}
      onMouseDown={handleBackdrop}
      className="bid-dialog m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-2xl border border-[#37414a] bg-[#101418] p-0 text-white shadow-[0_28px_100px_rgba(0,0,0,0.68)]"
    >
      <div onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-5 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[#67e85f]">
              {target.rank ? `Bid to challenge rank #${target.rank}` : "Join the leaderboard"}
            </p>
            <h2 id={titleId} className="text-2xl font-bold tracking-[-0.03em]">
              Place your bid
            </h2>
            <p id={descriptionId} className="mt-1.5 text-sm leading-5 text-[#aab2ba]">
              Set your new weekly total, then pay securely with Stripe.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close bid form"
            onClick={close}
            disabled={submitting}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#aab2ba] transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 px-5 py-4 sm:px-6">
          <label className="block text-sm font-semibold text-[#e7ebee]">
            Product name
            <input
              name="name"
              autoFocus
              autoComplete="organization"
              required
              minLength={2}
              maxLength={60}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Acme Analytics"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-semibold text-[#e7ebee]">
            Website URL
            <input
              name="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              required
              maxLength={300}
              value={form.url}
              onChange={(event) => updateField("url", event.target.value)}
              placeholder="yourproduct.com"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-semibold text-[#e7ebee]">
            <span className="flex items-center justify-between gap-4">
              Short description
              <span className="tabular-nums text-xs font-normal text-[#aab2ba]">
                {form.description.length}/120
              </span>
            </span>
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={120}
              rows={2}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="What does your SaaS help people do?"
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#090c0f] px-3.5 py-3 text-[15px] leading-5 text-white placeholder:text-[#74808a] hover:border-white/20 focus:border-[#67e85f]/60 focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-[#e7ebee]">
            New total bid
            <span className="relative mt-2 block">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[#aab2ba]">$</span>
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                required
                min={minimumTotalCents / 100}
                step="0.01"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                aria-describedby={amountHelpId}
                className="tabular-nums h-11 w-full rounded-lg border border-white/10 bg-[#090c0f] pl-8 pr-3.5 text-[17px] font-semibold text-white hover:border-white/20 focus:border-[#67e85f]/60 focus:outline-none"
              />
            </span>
            <span id={amountHelpId} className="mt-2 block text-xs font-normal leading-5 text-[#8f98a1]">
              Estimated minimum: {dollars(minimumTotalCents)}. New listings start at {dollars(settings.minBidCents)};
              increases add at least {dollars(settings.minIncrementCents)}. The first successful bidder claims an
              unowned listing for that secure device; later increases from that device pay only the difference.
            </span>
          </label>

          {error ? (
            <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/[0.08] px-3.5 py-3 text-sm leading-5 text-red-200">
              {error}
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-xs leading-5 text-[#aab2ba]">
            <input
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#67e85f]"
            />
            <span>
              I understand that bids are final and non-refundable, rankings are temporary, and boards reset according
              to the schedule in the Terms. Read the{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-white">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-white">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-5 text-[15px] font-bold text-[#071006] shadow-[0_0_28px_rgba(103,232,95,0.13)] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c] disabled:cursor-wait disabled:opacity-65"
          >
            {submitting ? (
              <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
            ) : (
              <Gavel aria-hidden="true" size={17} strokeWidth={2.5} />
            )}
            {submitting ? "Starting checkout" : "Continue to secure checkout"}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#aab2ba]">
            <LockKeyhole aria-hidden="true" size={12} />
            Stripe handles your payment details. We never store card numbers.
          </p>
        </form>
      </div>
    </dialog>
  );
}
