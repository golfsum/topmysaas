export function formatUsd(cents: number, withCents = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents || cents % 100 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function dollarsToCents(value: string | number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  const cents = Math.round(parsed * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function calculateChargeCents(
  currentTotalCents: number,
  targetTotalCents: number,
): number {
  if (!Number.isSafeInteger(currentTotalCents) || currentTotalCents < 0) {
    throw new Error("Current total must be a non-negative integer.");
  }
  if (!Number.isSafeInteger(targetTotalCents) || targetTotalCents <= 0) {
    throw new Error("Target total must be a positive integer.");
  }

  return targetTotalCents - currentTotalCents;
}
