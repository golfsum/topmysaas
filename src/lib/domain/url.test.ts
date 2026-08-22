import { describe, expect, it } from "vitest";
import { normalizeWebsiteUrl } from "./url";

describe("website URL normalization", () => {
  it("adds HTTPS and removes cosmetic URL differences", () => {
    expect(normalizeWebsiteUrl("WWW.Example.com/")).toEqual({
      url: "https://www.example.com",
      normalizedUrl: "https://www.example.com",
      displayHost: "example.com",
    });
  });

  it("preserves useful paths and removes fragments", () => {
    expect(normalizeWebsiteUrl("https://example.com/product/#pricing").url).toBe(
      "https://example.com/product",
    );
  });

  it("rejects insecure and credentialed URLs", () => {
    expect(() => normalizeWebsiteUrl("http://example.com")).toThrow("HTTPS");
    expect(() => normalizeWebsiteUrl("https://user:pass@example.com")).toThrow(
      "credentials",
    );
  });
});
