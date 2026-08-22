import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { recordErrorEvent } = await import("@/lib/server/error-events");
  const digest =
    error && typeof error === "object" && "digest" in error
      ? String(error.digest)
      : undefined;
  const routePath = context.routePath || "unknown_route";
  const isPaymentRoute =
    routePath.includes("/api/checkout") ||
    routePath.includes("/api/stripe") ||
    routePath.includes("/api/bid/status");
  const vercelHeader = request.headers["x-vercel-id"];
  const requestId = Array.isArray(vercelHeader)
    ? vercelHeader[0]
    : vercelHeader;

  await recordErrorEvent({
    category: isPaymentRoute ? "payment" : "system",
    severity: isPaymentRoute ? "critical" : "error",
    code: "NEXT_UNCAUGHT_SERVER_ERROR",
    operation: `${context.routeType}:${routePath}`,
    message: "An uncaught server error reached the Next.js request boundary.",
    actionRequired: true,
    retryable: true,
    requestId,
    dedupeKey: `next:${routePath}:${digest || "unknown"}`,
  });
};
