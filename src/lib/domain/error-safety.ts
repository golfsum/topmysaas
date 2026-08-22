const secretPatterns = [
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]+\b/gi,
  /\bwhsec_[A-Za-z0-9_-]+\b/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi,
  /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gi,
] as const;

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function sanitizeOperationalText(
  value: unknown,
  fallback: string,
  maxLength = 320,
): string {
  if (typeof value !== "string") return fallback;

  let sanitized = value.replace(/[\u0000-\u001F\u007F]/g, " ");
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, "[redacted]");
  }
  sanitized = sanitized
    .replace(emailPattern, "[redacted email]")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) return fallback;
  return sanitized.length > maxLength
    ? `${sanitized.slice(0, Math.max(0, maxLength - 1))}…`
    : sanitized;
}

export function shouldRecordApiStatus(status: number): boolean {
  return Number.isInteger(status) && status >= 500;
}
