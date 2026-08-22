function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export type StripeCheckoutCopy = {
  productName: string;
  description: string;
  submitMessage: string;
};

export function createStripeCheckoutCopy(
  listingName: string,
  targetTotalCents: number,
  amountDueCents: number,
): StripeCheckoutCopy {
  const targetTotal = dollars(targetTotalCents);
  const amountDue = dollars(amountDueCents);
  const paysOnlyIncrease = amountDueCents < targetTotalCents;

  return {
    productName: `TopMySaaS bid to ${targetTotal} total for ${listingName}`,
    description: paysOnlyIncrease
      ? `Weekly leaderboard total after payment: ${targetTotal}. Amount due today is the ${amountDue} increase.`
      : `Weekly leaderboard total after payment: ${targetTotal}.`,
    submitMessage: paysOnlyIncrease
      ? `This payment raises the weekly bid total to ${targetTotal}. You are charged ${amountDue} today because the existing paid total was verified. Final rank is recalculated after payment.`
      : `This payment sets the weekly bid total to ${targetTotal}. Final rank is recalculated after payment.`,
  };
}
