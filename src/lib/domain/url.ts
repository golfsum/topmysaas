export type NormalizedWebsite = {
  url: string;
  normalizedUrl: string;
  displayHost: string;
};

export function normalizeWebsiteUrl(input: string): NormalizedWebsite {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid website URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Website URLs must use HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Website URLs cannot include credentials.");
  }
  if (!parsed.hostname || parsed.hostname.length > 253) {
    throw new Error("Enter a valid website hostname.");
  }

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.pathname === "/") {
    parsed.pathname = "";
  } else {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  const normalizedUrl = parsed.toString().replace(/\/$/, "");
  return {
    url: normalizedUrl,
    normalizedUrl,
    displayHost: parsed.hostname.replace(/^www\./, ""),
  };
}
