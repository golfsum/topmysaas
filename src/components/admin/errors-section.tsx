"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  StripeConnectionCheck,
  SystemErrorActivity,
  SystemErrorFeed,
} from "@/lib/domain/types";

type ErrorFilter = "all" | "payment" | "open" | "resolved";

type ErrorsSectionProps = {
  refreshKey: number;
  onUnauthorized: () => void;
  initialFeed?: SystemErrorFeed;
};

const paymentCategories = new Set(["payment", "checkout", "webhook"]);

async function getResponseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Use the status-based fallback below.
  }
  return `Request failed with status ${response.status}.`;
}

function formatUtc(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(isoDate));
}

function configurationTone(ready: boolean | undefined) {
  if (ready === undefined) {
    return "border-white/8 bg-white/4 text-zinc-400";
  }
  return ready
    ? "border-[#67e85f]/15 bg-[#67e85f]/7 text-[#9af694]"
    : "border-red-400/20 bg-red-400/8 text-red-200";
}

function severityStyle(severity: SystemErrorActivity["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-red-400/25 bg-red-400/10 text-red-200";
    case "warning":
      return "border-amber-300/20 bg-amber-300/8 text-amber-200";
    default:
      return "border-orange-300/20 bg-orange-300/8 text-orange-200";
  }
}

function ErrorReferences({ error }: { error: SystemErrorActivity }) {
  const references = [
    ["Stripe session", error.stripeSessionId],
    ["PaymentIntent", error.stripePaymentIntentId],
    ["Stripe event", error.stripeEventId],
    ["Stripe request", error.stripeRequestId],
    ["Bid intent", error.bidIntentId],
    ["Listing", error.listingId],
    ["Request", error.requestId],
    ["Week", error.weekId],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (references.length === 0 && !error.stripeErrorCode && !error.declineCode) {
    return null;
  }

  return (
    <details className="mt-4 rounded-xl border border-white/7 bg-black/20 px-4 py-3">
      <summary className="cursor-pointer select-none text-xs font-medium text-zinc-400 transition hover:text-zinc-200">
        Diagnostic references
      </summary>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        {references.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-zinc-600">{label}</dt>
            <dd
              className="mt-1 select-all truncate font-mono text-zinc-300"
              title={value}
            >
              {value}
            </dd>
          </div>
        ))}
        {error.stripeErrorCode ? (
          <div>
            <dt className="text-zinc-600">Stripe error code</dt>
            <dd className="mt-1 font-mono text-zinc-300">
              {error.stripeErrorCode}
            </dd>
          </div>
        ) : null}
        {error.declineCode ? (
          <div>
            <dt className="text-zinc-600">Decline code</dt>
            <dd className="mt-1 font-mono text-zinc-300">
              {error.declineCode}
            </dd>
          </div>
        ) : null}
      </dl>
    </details>
  );
}

export function ErrorsSection({
  refreshKey,
  onUnauthorized,
  initialFeed,
}: ErrorsSectionProps) {
  const [feed, setFeed] = useState<SystemErrorFeed | null>(initialFeed ?? null);
  const [filter, setFilter] = useState<ErrorFilter>("all");
  const [isLoading, setIsLoading] = useState(!initialFeed);
  const [isCheckingStripe, setIsCheckingStripe] = useState(false);
  const [changingErrorId, setChangingErrorId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stripeCheck, setStripeCheck] =
    useState<StripeConnectionCheck | null>(null);

  const fetchFeed = useCallback(async (): Promise<SystemErrorFeed | null> => {
    const response = await fetch("/api/admin/errors", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
    });
    if (response.status === 401) {
      onUnauthorized();
      return null;
    }
    if (!response.ok) throw new Error(await getResponseError(response));
    const body = (await response.json()) as { feed: SystemErrorFeed };
    return body.feed;
  }, [onUnauthorized]);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextFeed = await fetchFeed();
      if (nextFeed) setFeed(nextFeed);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "System errors could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchFeed]);

  useEffect(() => {
    let cancelled = false;
    void fetchFeed()
      .then((nextFeed) => {
        if (cancelled || !nextFeed) return;
        setFeed(nextFeed);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "System errors could not be loaded.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchFeed, refreshKey]);

  const filteredErrors = useMemo(() => {
    const errors = feed?.errors ?? [];
    switch (filter) {
      case "payment":
        return errors.filter((error) => paymentCategories.has(error.category));
      case "open":
        return errors.filter((error) => error.status === "open");
      case "resolved":
        return errors.filter((error) => error.status === "resolved");
      default:
        return errors;
    }
  }, [feed, filter]);

  const openErrors = (feed?.errors ?? []).filter(
    (error) => error.status === "open",
  );
  const actionableErrors = openErrors.filter((error) => error.actionRequired);
  const openObservations = openErrors.filter((error) => !error.actionRequired);
  const actionablePaymentErrors = actionableErrors.filter((error) =>
    paymentCategories.has(error.category),
  );

  async function checkStripe() {
    if (isCheckingStripe) return;
    setIsCheckingStripe(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/errors", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "checkStripe" }),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) throw new Error(await getResponseError(response));
      const body = (await response.json()) as {
        stripeCheck: StripeConnectionCheck;
      };
      setStripeCheck(body.stripeCheck);
    } catch (error) {
      setStripeCheck(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Stripe could not be reached.",
      );
      await loadFeed();
    } finally {
      setIsCheckingStripe(false);
    }
  }

  async function setResolution(error: SystemErrorActivity) {
    if (changingErrorId) return;
    setChangingErrorId(error.id);
    setErrorMessage(null);
    const resolved = error.status !== "resolved";
    try {
      const response = await fetch("/api/admin/errors", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "setResolution",
          id: error.id,
          resolved,
        }),
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) throw new Error(await getResponseError(response));
      setFeed((current) =>
        current
          ? {
              ...current,
              errors: current.errors.map((entry) =>
                entry.id === error.id
                  ? {
                      ...entry,
                      status: resolved ? "resolved" : "open",
                      ...(resolved
                        ? { resolvedAt: new Date().toISOString() }
                        : { resolvedAt: undefined }),
                    }
                  : entry,
              ),
            }
          : current,
      );
    } catch (failure) {
      setErrorMessage(
        failure instanceof Error
          ? failure.message
          : "The error status could not be changed.",
      );
    } finally {
      setChangingErrorId(null);
    }
  }

  const configuration = feed?.paymentConfiguration;
  const stripeKeyReady = configuration?.stripeKeyConfigured;
  const webhookReady = configuration?.webhookConfigured;

  return (
    <section aria-labelledby="system-errors-title" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e85f]">
            Operations
          </p>
          <h1
            id="system-errors-title"
            className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl"
          >
            System errors
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Payment, webhook, Firebase, and server failures recorded by the app.
            Sensitive payment and customer data is never stored here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFeed()}
          disabled={isLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:opacity-50 lg:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh errors
        </button>
      </div>

      {errorMessage ? (
        <div
          className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="rounded-2xl border border-white/8 bg-[#0d1010] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Stripe diagnostics</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Configuration is checked locally. The API test is read-only and runs
                only when you request it.
              </p>
            </div>
            <CreditCard className="h-5 w-5 shrink-0 text-[#86f27f]" aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className={`rounded-xl border px-4 py-3 ${configurationTone(stripeKeyReady)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">
                Secret key
              </p>
              <p className="mt-2 text-sm font-semibold">
                {!configuration
                  ? "Checking configuration"
                  : stripeKeyReady
                  ? `${configuration?.stripeMode === "live" ? "Live" : configuration?.stripeMode === "test" ? "Test" : "Unknown mode"} key configured`
                  : "Missing"}
              </p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${configurationTone(webhookReady)}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">
                Webhook signing
              </p>
              <p className="mt-2 text-sm font-semibold">
                {!configuration
                  ? "Checking configuration"
                  : webhookReady
                    ? "Secret configured"
                    : "Missing"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/7 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                <Wifi className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {stripeCheck
                    ? `Stripe API responded in ${stripeCheck.responseTimeMs.toLocaleString("en-US")} ms`
                    : "Stripe API not checked this visit"}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {stripeCheck
                    ? `Checked ${formatUtc(stripeCheck.checkedAt)}`
                    : "This verifies the server credential without creating a charge."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void checkStripe()}
              disabled={isCheckingStripe || stripeKeyReady === false}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-4 text-xs font-semibold text-[#10200e] transition hover:bg-[#7df175] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7df175] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {isCheckingStripe ? "Checking" : "Check Stripe now"}
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-white/8 bg-[#0d1010] p-5 sm:p-6">
          <p className="text-sm font-semibold text-white">Current status</p>
          <div className="mt-5 flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                actionableErrors.length > 0
                  ? "border-red-400/20 bg-red-400/10 text-red-300"
                  : "border-[#67e85f]/15 bg-[#67e85f]/8 text-[#86f27f]"
              }`}
            >
              {actionableErrors.length > 0 ? (
                <CircleAlert className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">
                {actionableErrors.length.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Actionable {actionableErrors.length === 1 ? "issue" : "issues"}, including{" "}
                {actionablePaymentErrors.length.toLocaleString("en-US")} payment-related
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-white/7 pt-4 text-xs leading-5 text-zinc-500">
            <p>
              Last successful payment:{" "}
              <span className="text-zinc-300">
                {feed?.lastSuccessfulPaymentAt
                  ? formatUtc(feed.lastSuccessfulPaymentAt)
                  : "None recorded"}
              </span>
            </p>
            <p className="mt-2">
              Last verified Stripe webhook:{" "}
              <span className="text-zinc-300">
                {feed?.lastVerifiedWebhookAt
                  ? `${formatUtc(feed.lastVerifiedWebhookAt)}${
                      feed.lastVerifiedWebhookLivemode === undefined
                        ? ""
                        : feed.lastVerifiedWebhookLivemode
                          ? " · live"
                          : " · test"
                    }${
                      feed.lastVerifiedWebhookEventType
                        ? ` · ${feed.lastVerifiedWebhookEventType}`
                        : ""
                    }`
                  : "None recorded yet"}
              </span>
            </p>
            {!feed?.lastVerifiedWebhookAt ? (
              <p className="mt-2 text-amber-200/70">
                A configured signing secret is only confirmed after Stripe sends a
                valid signed event.
              </p>
            ) : null}
            {openObservations.length > 0 ? (
              <p className="mt-2">
                {openObservations.length.toLocaleString("en-US")} non-actionable{" "}
                {openObservations.length === 1 ? "observation is" : "observations are"} also retained for review.
              </p>
            ) : null}
            <p className="mt-2">
              Canceled and expired Checkouts are normal lifecycle events and are not
              counted as system errors.
            </p>
          </div>
        </article>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1010]">
        <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold text-white">Recorded issues</h2>
            <p className="mt-1 text-xs text-zinc-500">Newest activity first, up to 100 records</p>
          </div>
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["all", "payment", "open", "resolved"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-medium capitalize transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] ${
                  filter === value
                    ? "bg-[#67e85f]/10 text-[#9af694]"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {value === "payment" ? "Payments" : value}
              </button>
            ))}
          </div>
        </div>

        {isLoading && !feed ? (
          <div className="px-6 py-16 text-center" role="status">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-zinc-600" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-400">Loading system errors</p>
          </div>
        ) : filteredErrors.length > 0 ? (
          <div className="divide-y divide-white/6">
            {filteredErrors.map((error) => (
              <article key={error.id} className="px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${severityStyle(error.severity)}`}>
                        {error.severity}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                        {error.category}
                      </span>
                      {error.stripeLivemode !== undefined ? (
                        <span className="rounded-full border border-sky-300/15 bg-sky-300/7 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-200">
                          {error.stripeLivemode ? "Live Stripe" : "Test Stripe"}
                        </span>
                      ) : null}
                      {error.status === "resolved" ? (
                        <span className="rounded-full border border-[#67e85f]/15 bg-[#67e85f]/7 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9af694]">
                          Resolved
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 font-mono text-xs font-semibold text-zinc-300">
                      {error.code}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-200">
                      {error.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600">
                      <span>{formatUtc(error.lastOccurredAt)}</span>
                      <span>{error.operation}</span>
                      {error.httpStatus ? <span>HTTP {error.httpStatus}</span> : null}
                      {error.occurrenceCount > 1 ? (
                        <span>{error.occurrenceCount.toLocaleString("en-US")} occurrences</span>
                      ) : null}
                    </div>
                    <ErrorReferences error={error} />
                  </div>
                  <button
                    type="button"
                    onClick={() => void setResolution(error)}
                    disabled={changingErrorId !== null}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-white/9 px-3.5 text-xs font-medium text-zinc-400 transition hover:border-white/18 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changingErrorId === error.id
                      ? "Saving"
                      : error.status === "resolved"
                        ? "Reopen"
                        : "Mark resolved"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            {feed?.errors.length === 0 ? (
              <CheckCircle2 className="mx-auto h-7 w-7 text-[#67e85f]" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mx-auto h-7 w-7 text-zinc-600" aria-hidden="true" />
            )}
            <p className="mt-4 text-sm font-medium text-zinc-300">
              {feed?.errors.length === 0
                ? "No recorded system errors"
                : "No issues match this filter"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {feed?.errors.length === 0
                ? "New server and payment issues will appear here automatically."
                : "Choose another filter to review the remaining records."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
