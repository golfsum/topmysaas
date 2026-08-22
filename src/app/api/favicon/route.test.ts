import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("favicon route", () => {
  it("fetches only the fixed favicon provider and returns cacheable image bytes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        "https://topmysaas.com/api/favicon?domain=clientplot.com",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("s-maxage=604800");
    const upstream = fetchMock.mock.calls[0][0] as URL;
    expect(upstream.origin).toBe("https://www.google.com");
    expect(upstream.searchParams.get("domain_url")).toBe(
      "https://clientplot.com",
    );
  });

  it("rejects local or malformed domains before any upstream request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    for (const domain of ["localhost", "127.0.0.1", "site.internal", "clientplot.com/path"]) {
      const response = await GET(
        new NextRequest(
          `https://topmysaas.com/api/favicon?domain=${encodeURIComponent(domain)}`,
        ),
      );
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not pass through oversized or non-image responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("not an image", {
          headers: { "Content-Type": "text/html" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array(128 * 1024 + 1), {
          headers: { "Content-Type": "image/png" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const request = () =>
      GET(
        new NextRequest(
          "https://topmysaas.com/api/favicon?domain=clientplot.com",
        ),
      );
    expect((await request()).status).toBe(404);
    expect((await request()).status).toBe(404);
  });
});
