import { NextResponse } from "next/server";
import { applyTakeover, getSpotState } from "@/lib/store";
import { baseUrl, getStripe, stripeEnabled } from "@/lib/stripe";
import { formatUsd, minNextBidCents } from "@/lib/types";
import { bidSchema } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = bidSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ungültige Eingaben";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const bid = parsed.data;

  const state = await getSpotState();
  const min = minNextBidCents(state);
  if (bid.amountCents < min) {
    return NextResponse.json(
      {
        error: `Du wurdest überboten – Minimum ist jetzt ${formatUsd(min)}`,
        minNextBidCents: min,
      },
      { status: 409 }
    );
  }

  // Demo-Modus ohne Stripe: Übernahme sofort anwenden.
  if (!stripeEnabled()) {
    const result = await applyTakeover(bid);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Du wurdest überboten – Minimum ist jetzt ${formatUsd(result.minNextBidCents)}`,
          minNextBidCents: result.minNextBidCents,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, demo: true });
  }

  // Stripe-Modus: Checkout-Session erstellen, Übernahme erst nach Zahlung (Webhook).
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: bid.amountCents,
          product_data: {
            name: `BrandSpot-Übernahme: ${bid.brand}`,
            description: bid.message,
          },
        },
      },
    ],
    metadata: {
      brand: bid.brand,
      message: bid.message,
      url: bid.url ?? "",
      imageUrl: bid.imageUrl ?? "",
      color: bid.color,
      amountCents: String(bid.amountCents),
    },
    success_url: `${baseUrl()}/success`,
    cancel_url: `${baseUrl()}/`,
  });

  return NextResponse.json({ ok: true, checkoutUrl: session.url });
}
