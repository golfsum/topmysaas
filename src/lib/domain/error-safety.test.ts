import { describe, expect, it } from "vitest";

import {
  sanitizeOperationalText,
  shouldRecordApiStatus,
} from "./error-safety";

describe("operational error safety", () => {
  it("redacts credentials and personal email from stored messages", () => {
    const message = sanitizeOperationalText(
      "Stripe sk_live_supersecret whsec_alsosecret Bearer token.value user@example.com",
      "fallback",
    );

    expect(message).not.toContain("sk_live_supersecret");
    expect(message).not.toContain("whsec_alsosecret");
    expect(message).not.toContain("token.value");
    expect(message).not.toContain("user@example.com");
    expect(message).toContain("[redacted]");
    expect(message).toContain("[redacted email]");
  });

  it("normalizes controls and enforces the storage limit", () => {
    const message = sanitizeOperationalText(`first\n${"x".repeat(500)}`, "fallback", 40);

    expect(message).not.toContain("\n");
    expect(message).toHaveLength(40);
    expect(message.endsWith("…")).toBe(true);
  });

  it("records infrastructure failures without treating expected 4xx flow as incidents", () => {
    expect(shouldRecordApiStatus(409)).toBe(false);
    expect(shouldRecordApiStatus(429)).toBe(false);
    expect(shouldRecordApiStatus(500)).toBe(true);
    expect(shouldRecordApiStatus(503)).toBe(true);
  });
});
