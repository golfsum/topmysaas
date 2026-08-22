"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

type LaunchCountdownProps = {
  launchAt: string;
  serverNow: string;
};

export type LaunchTimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMilliseconds: number;
};

const RELOAD_INTERVAL_MS = 5_000;
const RELOAD_STORAGE_KEY = "topmysaas-launch-refresh";

export function calculateLaunchTimeLeft(
  launchAt: string,
  nowMilliseconds: number,
): LaunchTimeLeft | null {
  const launchTime = Date.parse(launchAt);
  if (!Number.isFinite(launchTime)) return null;

  const remaining = Math.max(0, launchTime - nowMilliseconds);
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
    totalMilliseconds: remaining,
  };
}

function launchDateLabel(launchAt: string) {
  const launchDate = new Date(launchAt);
  if (Number.isNaN(launchDate.getTime())) return "the scheduled launch time";

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(launchDate);
  const time = `${pad(launchDate.getUTCHours())}:${pad(
    launchDate.getUTCMinutes(),
  )}`;
  return `${date} at ${time} UTC`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function LaunchCountdown({
  launchAt,
  serverNow,
}: LaunchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<LaunchTimeLeft | null>(null);
  const [launching, setLaunching] = useState(false);
  const exactLaunchLabel = launchDateLabel(launchAt);

  useEffect(() => {
    const initialServerTime = Date.parse(serverNow);
    const launchTime = Date.parse(launchAt);
    if (!Number.isFinite(initialServerTime) || !Number.isFinite(launchTime)) {
      return;
    }

    const initialClientTime = Date.now();
    let reloadTimer: number | undefined;

    const scheduleReload = () => {
      if (reloadTimer !== undefined) return;

      let lastReload = 0;
      try {
        lastReload = Number(window.sessionStorage.getItem(RELOAD_STORAGE_KEY)) || 0;
      } catch {
        lastReload = 0;
      }
      const delay = Math.max(
        250,
        RELOAD_INTERVAL_MS - (Date.now() - lastReload),
      );
      reloadTimer = window.setTimeout(() => {
        try {
          window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
        } catch {
          // A disabled storage API should not prevent the launch refresh.
        }
        window.location.reload();
      }, delay);
    };

    const update = () => {
      const estimatedServerTime =
        initialServerTime + (Date.now() - initialClientTime);
      const next = calculateLaunchTimeLeft(launchAt, estimatedServerTime);
      setTimeLeft(next);
      if (next?.totalMilliseconds === 0) {
        setLaunching(true);
        if (document.visibilityState === "visible") scheduleReload();
      }
    };

    const updateWhenVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    const timer = window.setInterval(update, 1_000);
    update();
    document.addEventListener("visibilitychange", updateWhenVisible);
    window.addEventListener("focus", update);

    return () => {
      window.clearInterval(timer);
      if (reloadTimer !== undefined) window.clearTimeout(reloadTimer);
      document.removeEventListener("visibilitychange", updateWhenVisible);
      window.removeEventListener("focus", update);
    };
  }, [launchAt, serverNow]);

  const values = [
    [timeLeft ? pad(timeLeft.days) : "--", "Days"],
    [timeLeft ? pad(timeLeft.hours) : "--", "Hrs"],
    [timeLeft ? pad(timeLeft.minutes) : "--", "Min"],
    [timeLeft ? pad(timeLeft.seconds) : "--", "Sec"],
  ] as const;

  return (
    <div className="max-w-xl rounded-xl border border-[#67e85f]/25 bg-[#67e85f]/[0.065] p-4 shadow-[0_0_40px_rgba(103,232,95,0.07)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#83f27c]">
          <Clock3 aria-hidden="true" size={14} />
          Leaderboard goes live in
        </p>
        <time
          dateTime={launchAt}
          className="hidden text-xs text-[#aab2ba] sm:block"
        >
          {exactLaunchLabel}
        </time>
      </div>

      <p className="sr-only">
        The leaderboard launches on {exactLaunchLabel}.
      </p>
      <div
        aria-hidden="true"
        className="mt-3 grid grid-cols-4 gap-2 sm:gap-3"
      >
        {values.map(([value, label]) => (
          <span
            key={label}
            className="flex min-h-14 flex-col items-center justify-center rounded-lg border border-white/10 bg-[#090c0f]/80 px-1 py-2"
          >
            <span className="tabular-nums text-xl font-extrabold tracking-[-0.03em] text-white sm:text-2xl">
              {value}
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8f98a1]">
              {label}
            </span>
          </span>
        ))}
      </div>

      <time
        dateTime={launchAt}
        className="mt-3 block text-center text-xs text-[#aab2ba] sm:hidden"
      >
        {exactLaunchLabel}
      </time>
      {launching ? (
        <p
          aria-live="polite"
          className="mt-2 min-h-5 text-xs text-[#b9c1c7]"
        >
          Launching now. This page will refresh automatically.
        </p>
      ) : (
        <p className="mt-2 min-h-5 text-xs text-[#b9c1c7]">
          All paid pre-launch listings and totals carry into the opening board.
        </p>
      )}
    </div>
  );
}
