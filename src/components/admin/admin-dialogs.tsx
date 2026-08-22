"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import styles from "@/app/admin/admin.module.css";
import type { AdminListing } from "@/lib/domain/types";
import type { AdminListingInput } from "@/lib/domain/validation";

const fieldClassName =
  "min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-[#67e85f]/70 focus:ring-3 focus:ring-[#67e85f]/10 disabled:cursor-not-allowed disabled:opacity-60";

type DialogFrameProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
  isBusy?: boolean;
  widthClassName?: string;
};

function DialogFrame({
  title,
  description,
  children,
  onClose,
  isBusy = false,
  widthClassName = "max-w-lg",
}: DialogFrameProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    dialog.showModal();
    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isBusy) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
      className={`${styles.dialog} fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${widthClassName} overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1010] p-0 text-zinc-100 shadow-2xl shadow-black/60 backdrop:bg-black/70`}
    >
      <div className="flex items-start justify-between gap-5 border-b border-white/8 px-5 py-5 sm:px-6">
        <div>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p id={descriptionId} className="mt-1.5 text-sm leading-5 text-zinc-400">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseAdminBid(value: string): number | null {
  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars < 0) {
    return null;
  }

  const cents = Math.round(dollars * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

type ListingDialogProps = {
  listing?: AdminListing;
  isBusy: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (listing: AdminListingInput) => Promise<boolean>;
};

export function ListingDialog({
  listing,
  isBusy,
  errorMessage,
  onClose,
  onSubmit,
}: ListingDialogProps) {
  const [name, setName] = useState(listing?.name ?? "");
  const [url, setUrl] = useState(listing?.url ?? "https://");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [bidAmount, setBidAmount] = useState(
    listing ? dollarsFromCents(listing.bidAmountCents) : "0.00",
  );
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const bidAmountCents = parseAdminBid(bidAmount);
    if (bidAmountCents === null) {
      setFormError("Enter a valid non-negative bid amount.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setFormError("Product name must be between 2 and 60 characters.");
      return;
    }

    if (trimmedDescription.length < 10 || trimmedDescription.length > 120) {
      setFormError("Description must be between 10 and 120 characters.");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setFormError("Enter a complete HTTPS website URL.");
      return;
    }

    if (parsedUrl.protocol !== "https:") {
      setFormError("Website URL must use HTTPS.");
      return;
    }

    const didSave = await onSubmit({
      name: trimmedName,
      url: parsedUrl.toString(),
      description: trimmedDescription,
      bidAmountCents,
    });

    if (didSave) {
      onClose();
    }
  }

  return (
    <DialogFrame
      title={listing ? "Edit listing" : "Add listing"}
      description={
        listing
          ? "Update the product details or force a new paid total."
          : "Create a listing directly in the current weekly board."
      }
      onClose={onClose}
      isBusy={isBusy}
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-6">
        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          Product name
          <input
            className={fieldClassName}
            name="name"
            required
            minLength={2}
            maxLength={60}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isBusy}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          Website URL
          <input
            className={fieldClassName}
            name="url"
            type="url"
            inputMode="url"
            required
            maxLength={300}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={isBusy}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          <span className="flex items-center justify-between gap-4">
            Short description
            <span
              className={`font-mono text-xs ${
                description.length > 120 ? "text-red-300" : "text-zinc-500"
              }`}
            >
              {description.length}/120
            </span>
          </span>
          <textarea
            className={`${fieldClassName} min-h-24 resize-y py-3`}
            name="description"
            required
            minLength={10}
            maxLength={120}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isBusy}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          Bid total
          <span className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-zinc-500">
              $
            </span>
            <input
              className={`${fieldClassName} pl-7 font-mono tabular-nums`}
              name="bidAmount"
              type="number"
              inputMode="decimal"
              min="0"
              max="999999.99"
              step="0.01"
              required
              value={bidAmount}
              onChange={(event) => setBidAmount(event.target.value)}
              disabled={isBusy}
            />
          </span>
          <span className="text-xs font-normal leading-5 text-zinc-500">
            Admin changes do not create a Stripe charge.
          </span>
        </label>

        {formError || errorMessage ? (
          <div
            className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {formError || errorMessage}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
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
            ) : null}
            {listing ? "Save changes" : "Add listing"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  isBusy: boolean;
  errorMessage?: string;
  tone?: "danger" | "warning";
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  isBusy,
  errorMessage,
  tone = "danger",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  async function confirm() {
    if (await onConfirm()) {
      onClose();
    }
  }

  return (
    <DialogFrame
      title={title}
      description={description}
      onClose={onClose}
      isBusy={isBusy}
      widthClassName="max-w-md"
    >
      <div className="px-5 py-6 sm:px-6">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
            tone === "danger"
              ? "border-red-400/20 bg-red-400/10 text-red-300"
              : "border-amber-400/20 bg-amber-400/10 text-amber-300"
          }`}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        {errorMessage ? (
          <div
            className="mt-5 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={isBusy}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 ${
              tone === "danger"
                ? "bg-red-400 text-red-950 hover:bg-red-300 focus-visible:outline-red-300"
                : "bg-amber-300 text-amber-950 hover:bg-amber-200 focus-visible:outline-amber-200"
            }`}
          >
            {isBusy ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
