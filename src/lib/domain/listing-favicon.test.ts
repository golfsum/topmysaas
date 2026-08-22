import { describe, expect, it } from "vitest";

import { listingFaviconPath, publicFaviconHostname } from "./listing-favicon";

describe("listing favicons", () => {
  it("builds a same-origin favicon path for a public HTTPS hostname", () => {
    expect(publicFaviconHostname("https://WWW.ClientPlot.com/pricing")).toBe(
      "www.clientplot.com",
    );
    expect(listingFaviconPath("https://clientplot.com/product")).toBe(
      "/api/favicon?domain=clientplot.com",
    );
  });

  it("does not create favicon requests for local, IP, insecure, or custom-port URLs", () => {
    for (const value of [
      "http://clientplot.com",
      "https://localhost",
      "https://app.internal",
      "https://127.0.0.1",
      "https://[::1]",
      "https://example.com:8443",
    ]) {
      expect(listingFaviconPath(value)).toBeNull();
    }
  });
});
