import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyBid } from "@/lib/store";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe ist nicht konfiguriert" }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signatur fehlt" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const m = session.metadata ?? {};
    const amountCents = Number(m.amountCents);
    if (m.brand && m.message && Number.isInteger(amountCents) && amountCents > 0) {
      // Jedes bezahlte Gebot landet in der Rangliste – die Platzierung
      // ergibt sich aus Betrag und Zahlungszeitpunkt.
      await applyBid({
        brand: m.brand,
        message: m.message,
        url: m.url || null,
        imageUrl: m.imageUrl || null,
        color: /^#[0-9a-f]{6}$/.test(m.color ?? "") ? m.color : "#111827",
        amountCents,
      });
    }
  }

  return NextResponse.json({ received: true });
}
