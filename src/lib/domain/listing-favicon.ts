const RESERVED_SUFFIXES = [
  ".corp",
  ".example",
  ".home",
  ".internal",
  ".invalid",
  ".lan",
  ".local",
  ".localhost",
  ".test",
] as const;

const PUBLIC_HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function publicFaviconHostname(value: string): string | null {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      hostname === "localhost" ||
      hostname.includes(":") ||
      /^\d+(?:\.\d+){3}$/.test(hostname) ||
      RESERVED_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
      !PUBLIC_HOSTNAME_PATTERN.test(hostname)
    ) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

export function listingFaviconPath(value: string): string | null {
  const hostname = publicFaviconHostname(value);
  return hostname
    ? `/api/favicon?domain=${encodeURIComponent(hostname)}`
    : null;
}
