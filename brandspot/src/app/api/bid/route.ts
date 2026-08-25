import { NextResponse } from "next/server";
import { addPendingBid, applyBid, findListing } from "@/lib/store";
import { baseUrl, getStripe, stripeEnabled } from "@/lib/stripe";
import { formatUsd } from "@/lib/types";
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

  // Demo-Modus ohne Stripe: Gebot sofort anwenden (neu oder Erhöhung).
  if (!stripeEnabled()) {
    const result = await applyBid(bid);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Dieser Eintrag steht schon bei ${formatUsd(result.currentCents)} – zum Erhöhen musst du mehr bieten.`,
          currentCents: result.currentCents,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      demo: true,
      rank: result.rank,
      raised: result.raised,
      paidCents: result.paidCents,
    });
  }

  // Stripe-Modus: Beim Erhöhen eines bestehenden Eintrags wird nur die
  // Differenz berechnet. Das Gebot (der neue Gesamtbetrag) wird serverseitig
  // geparkt und zählt erst nach bestätigter Zahlung (Webhook).
  const existing = await findListing(bid.url, bid.brand);
  if (existing && bid.amountCents <= existing.amountCents) {
    return NextResponse.json(
      {
        error: `Dieser Eintrag steht schon bei ${formatUsd(existing.amountCents)} – zum Erhöhen musst du mehr bieten.`,
        currentCents: existing.amountCents,
      },
      { status: 409 }
    );
  }
  const chargeCents = existing
    ? bid.amountCents - existing.amountCents
    : bid.amountCents;

  const token = await addPendingBid(bid);
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: chargeCents,
          product_data: {
            name: existing
              ? `BrandSpot-Erhöhung auf ${formatUsd(bid.amountCents)}: ${bid.brand}`
              : `BrandSpot-Gebot: ${bid.brand}`,
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
