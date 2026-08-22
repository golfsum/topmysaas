export type CheckoutClaimAction = "block" | "expire" | "release";

export function checkoutClaimAction(
  sessionStatus: "open" | "complete" | "expired" | null,
  ownedByRequester: boolean,
): CheckoutClaimAction {
  if (sessionStatus === "expired") return "release";
  if (sessionStatus === "open" && ownedByRequester) return "expire";
  return "block";
}
