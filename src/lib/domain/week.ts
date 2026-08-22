import {
  INITIAL_BOARD_START_AT,
  INITIAL_LIVE_WEEK_END_AT,
  INITIAL_PRELAUNCH_WEEK_ID,
  isInitialExtendedBoardPeriod,
} from "./launch";

const DAY_MS = 24 * 60 * 60 * 1_000;

export type WeekBounds = {
  weekId: string;
  startsAt: Date;
  nextResetAt: Date;
};

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getUtcWeekBounds(now = new Date()): WeekBounds {
  if (isInitialExtendedBoardPeriod(now)) {
    return {
      weekId: INITIAL_PRELAUNCH_WEEK_ID,
      startsAt: new Date(INITIAL_BOARD_START_AT),
      nextResetAt: new Date(INITIAL_LIVE_WEEK_END_AT),
    };
  }

  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const startsAt = new Date(utcMidnight - daysSinceMonday * DAY_MS);
  const nextResetAt = new Date(startsAt.getTime() + 7 * DAY_MS);

  return {
    weekId: formatUtcDate(startsAt),
    startsAt,
    nextResetAt,
  };
}

export function getPreviousWeekId(now = new Date()): string {
  const { startsAt } = getUtcWeekBounds(now);
  return getUtcWeekBounds(new Date(startsAt.getTime() - 1)).weekId;
}

export function isCheckoutWindowOpen(
  now: Date,
  closeMinutes: number,
): boolean {
  const { nextResetAt } = getUtcWeekBounds(now);
  return nextResetAt.getTime() - now.getTime() > closeMinutes * 60_000;
}
