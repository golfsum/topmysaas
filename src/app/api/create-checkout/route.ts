import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, description, bidAmount } = body;

    if (!name || !url || !bidAmount || bidAmount < 5) {
      return NextResponse.json(
        { error: "Invalid bid data. Minimum bid is $5." },
        { status: 400 }
      );
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;

    // If no Stripe key, return a clear demo message
    if (!stripeSecret) {
      return NextResponse.json({
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment variables.",
        demo: true,
      });
    }

    // Dynamic import so the app still builds without the package installed yet
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-02-24.acacia",
    });

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `TopMySaaS Bid — ${name}`,
              description: `Bid of $${bidAmount} for ${name} (${url})`,
            },
            unit_amount: Math.round(bidAmount * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        productName: name,
        productUrl: url,
        productDescription: description || "",
        bidAmount: String(bidAmount),
      },
      success_url: `${origin}/?success=1`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
