import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyBid, takePendingBid } from "@/lib/store";
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
    const token = session.metadata?.token;
    if (token) {
      // Geparktes Gebot einlösen – jedes bezahlte Gebot landet in der
      // Rangliste, die Platzierung ergibt sich aus Betrag und Zahlungszeitpunkt.
      const input = await takePendingBid(token);
      if (input) {
        const result = await applyBid(input);
        if (!result.ok) {
          // Zwischen Checkout und Zahlung wurde derselbe Eintrag bereits
          // höher gesetzt – Erstattung manuell über das Stripe-Dashboard.
          console.warn(
            `BrandSpot: Zahlung ${session.id} (${input.brand}, Ziel ${input.amountCents}¢) kam zu spät – Eintrag steht schon bei ${result.currentCents}¢.`
          );
        }
      } else {
        console.warn(
          `BrandSpot: Kein geparktes Gebot für Token ${token} (Session ${session.id}) – vermutlich abgelaufen.`
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
