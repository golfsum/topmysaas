"use client";

import { useEffect, useState } from "react";

type CountdownProps = {
  nextResetAt: string;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calculateTimeLeft(nextResetAt: string): TimeLeft | null {
  const resetTime = Date.parse(nextResetAt);
  if (!Number.isFinite(resetTime)) return null;

  const remaining = Math.max(0, resetTime - Date.now());
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function Countdown({ nextResetAt }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const update = () => setTimeLeft(calculateTimeLeft(nextResetAt));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [nextResetAt]);

  if (!timeLeft) {
    const resetLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(nextResetAt));
    return (
      <time
        dateTime={nextResetAt}
        className="tabular-nums whitespace-nowrap text-[#c8ced3]"
      >
        {resetLabel} UTC
      </time>
    );
  }

  const accessible = `${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds`;

  return (
    <time
      dateTime={nextResetAt}
      role="timer"
      className="tabular-nums whitespace-nowrap text-[#e8ecef]"
      aria-label={accessible}
    >
      <span aria-hidden="true">
        {pad(timeLeft.days)}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
      </span>
    </time>
  );
}
