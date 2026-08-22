import { z } from "zod";

export const checkoutRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters.")
    .max(60, "Product name must be 60 characters or fewer."),
  url: z
    .string()
    .trim()
    .min(4, "Enter a website URL.")
    .max(300, "Website URL must be 300 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(120, "Description must be 120 characters or fewer."),
  targetTotalCents: z
    .number()
    .int("Bid total must use whole cents.")
    .positive("Bid total must be greater than zero.")
    .max(99_999_999, "Bid total cannot exceed $999,999.99."),
});

export const adminListingInputSchema = checkoutRequestSchema
  .omit({ targetTotalCents: true })
  .extend({
    bidAmountCents: z
      .number()
      .int()
      .nonnegative()
      .max(99_999_999),
  });

export const boardSettingsSchema = z.object({
  minBidCents: z.number().int().min(100).max(10_000_000),
  minIncrementCents: z.number().int().min(100).max(1_000_000),
  checkoutCloseMinutes: z.number().int().min(30).max(1_440),
  currency: z.literal("usd").default("usd"),
});

export type CheckoutInput = z.infer<typeof checkoutRequestSchema>;
export type AdminListingInput = z.infer<typeof adminListingInputSchema>;
