"use client";

import { Save, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { BoardSettings } from "@/lib/domain/types";

const fieldClassName =
  "min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-[#67e85f]/70 focus:ring-3 focus:ring-[#67e85f]/10 disabled:cursor-not-allowed disabled:opacity-60";

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parsePositiveCents(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

type SettingsSectionProps = {
  settings: BoardSettings;
  isBusy: boolean;
  onSave: (settings: BoardSettings) => Promise<boolean>;
};

export function SettingsSection({
  settings,
  isBusy,
  onSave,
}: SettingsSectionProps) {
  const [minimumBid, setMinimumBid] = useState(dollars(settings.minBidCents));
  const [minimumIncrement, setMinimumIncrement] = useState(
    dollars(settings.minIncrementCents),
  );
  const [checkoutCloseMinutes, setCheckoutCloseMinutes] = useState(
    String(settings.checkoutCloseMinutes),
  );
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const minBidCents = parsePositiveCents(minimumBid);
    const minIncrementCents = parsePositiveCents(minimumIncrement);
    const closeMinutes = Number(checkoutCloseMinutes);

    if (minBidCents === null || minBidCents < 100) {
      setFormError("Minimum bid must be at least $1.00.");
      return;
    }

    if (minIncrementCents === null || minIncrementCents < 100) {
      setFormError("Minimum increment must be at least $1.00.");
      return;
    }

    if (
      !Number.isSafeInteger(closeMinutes) ||
      closeMinutes < 30 ||
      closeMinutes > 1_440
    ) {
      setFormError("Checkout close window must be between 30 and 1,440 minutes.");
      return;
    }

    await onSave({
      minBidCents,
      minIncrementCents,
      checkoutCloseMinutes: closeMinutes,
      currency: "usd",
    });
  }

  return (
    <section aria-labelledby="settings-title" className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e85f]">
          Board rules
        </p>
        <h1
          id="settings-title"
          className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl"
        >
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Set the public bidding floor and protect checkouts near the weekly reset.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl overflow-hidden rounded-2xl border border-white/8 bg-[#0d1010]"
      >
        <div className="border-b border-white/8 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-white">Bidding configuration</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            All currency values are stored as integer cents.
          </p>
        </div>

        <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
          <label className="grid gap-2 text-sm font-medium text-zinc-200">
            Minimum first bid
            <span className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-zinc-500">
                $
              </span>
              <input
                className={`${fieldClassName} pl-7 font-mono tabular-nums`}
                type="number"
                inputMode="decimal"
                min="1"
                max="100000"
                step="0.01"
                required
                value={minimumBid}
                onChange={(event) => setMinimumBid(event.target.value)}
                disabled={isBusy}
              />
            </span>
            <span className="text-xs font-normal leading-5 text-zinc-500">
              Lowest total accepted for a new listing.
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-zinc-200">
            Minimum bid increment
            <span className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-zinc-500">
                $
              </span>
              <input
                className={`${fieldClassName} pl-7 font-mono tabular-nums`}
                type="number"
                inputMode="decimal"
                min="1"
                max="10000"
                step="0.01"
                required
                value={minimumIncrement}
                onChange={(event) => setMinimumIncrement(event.target.value)}
                disabled={isBusy}
              />
            </span>
            <span className="text-xs font-normal leading-5 text-zinc-500">
              Smallest amount allowed above the target total.
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-zinc-200 sm:col-span-2">
            Checkout close window
            <span className="relative max-w-xs">
              <input
                className={`${fieldClassName} pr-20 font-mono tabular-nums`}
                type="number"
                inputMode="numeric"
                min="30"
                max="1440"
                step="1"
                required
                value={checkoutCloseMinutes}
                onChange={(event) => setCheckoutCloseMinutes(event.target.value)}
                disabled={isBusy}
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-zinc-500">
                minutes
              </span>
            </span>
            <span className="text-xs font-normal leading-5 text-zinc-500">
              New checkouts pause this many minutes before Monday 00:00 UTC.
            </span>
          </label>
        </div>

        {formError ? (
          <div
            className="mx-5 mb-5 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200 sm:mx-6"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-t border-white/8 bg-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2 text-xs leading-5 text-zinc-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#67e85f]" aria-hidden="true" />
            Server validation still applies to every checkout.
          </p>
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#67e85f] px-5 text-sm font-semibold text-[#10200e] transition hover:bg-[#7df175] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7df175] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isBusy ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save settings
          </button>
        </div>
      </form>
    </section>
  );
}
