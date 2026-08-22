export const INITIAL_LAUNCH_AT = "2026-08-24T00:00:00.000Z";
export const INITIAL_BOARD_START_AT = "2026-08-17T00:00:00.000Z";
export const INITIAL_PRELAUNCH_WEEK_ID = "2026-08-17";
export const INITIAL_LIVE_WEEK_END_AT = "2026-08-31T00:00:00.000Z";

export function isLaunchPageEnabled(value: string | undefined): boolean {
  return value !== "false";
}

export function resolveInitialLaunchAt(
  configuredValue: string | undefined,
): string {
  const configuredTime = Date.parse(configuredValue?.trim() ?? "");
  return Number.isFinite(configuredTime)
    ? new Date(configuredTime).toISOString()
    : INITIAL_LAUNCH_AT;
}

export function isBeforeInitialLaunch(
  now: Date,
  launchAt = INITIAL_LAUNCH_AT,
): boolean {
  const launchTime = Date.parse(launchAt);
  return Number.isFinite(launchTime) && now.getTime() < launchTime;
}

export function isInitialExtendedBoardPeriod(now: Date): boolean {
  return (
    now.getTime() >= Date.parse(INITIAL_BOARD_START_AT) &&
    now.getTime() < Date.parse(INITIAL_LIVE_WEEK_END_AT)
  );
}
