import { NextResponse } from "next/server";
import { addPendingBid, applyBid } from "@/lib/store";
import { baseUrl, getStripe, stripeEnabled } from "@/lib/stripe";
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

  // Demo-Modus ohne Stripe: Gebot sofort in die Rangliste aufnehmen.
  if (!stripeEnabled()) {
    const result = await applyBid(bid);
    return NextResponse.json({ ok: true, demo: true, rank: result.rank });
  }

  // Stripe-Modus: Gebot serverseitig parken (Logo-Uploads passen nicht in
  // Stripe-Metadata) und Checkout-Session mit Token erstellen. Das Gebot
  // zählt erst nach bestätigter Zahlung (Webhook).
  const token = await addPendingBid(bid);
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
            name: `BrandSpot-Gebot: ${bid.brand}`,
            description: bid.message.slice(0, 140),
          },
        },
      },
    ],
    metadata: { token },
    success_url: `${baseUrl()}/success`,
    cancel_url: `${baseUrl()}/`,
  });

  return NextResponse.json({ ok: true, checkoutUrl: session.url });
}
