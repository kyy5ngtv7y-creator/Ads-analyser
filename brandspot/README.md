# BrandSpot

Ein Werbeplatz-Auktionsspiel im Stil von [outbid.lol](https://outbid.lol) – aber für **Brands**:

- Es gibt genau **einen Spot** auf der Startseite.
- Eine Brand übernimmt ihn, indem sie **mehr zahlt als die aktuelle Besitzerin** (Startpreis **$1**, Mindestschritt $1).
- Die Brand präsentiert sich mit Name, Botschaft (max. 140 Zeichen), Link, Logo und Farbe.
- Sie bleibt sichtbar, **bis jemand mehr bietet**. Alle früheren Besitzer landen in der Historie.

## Starten

```bash
cd brandspot
npm install
npm run dev
```

Dann [http://localhost:3000](http://localhost:3000) öffnen.

### Demo-Modus (Standard)

Ohne Stripe-Keys läuft alles **ohne echte Zahlung**: Wer das Formular abschickt, übernimmt den Spot sofort. Ideal zum Testen und Vorführen.

### Echte Zahlungen mit Stripe

1. `.env.example` nach `.env.local` kopieren und ausfüllen:
   - `STRIPE_SECRET_KEY` – Secret Key aus dem Stripe-Dashboard
   - `STRIPE_WEBHOOK_SECRET` – Signing Secret des Webhooks
   - `NEXT_PUBLIC_BASE_URL` – öffentliche URL der Seite
2. Im Stripe-Dashboard einen Webhook auf `https://deine-domain/api/stripe/webhook` mit dem Event `checkout.session.completed` anlegen. Lokal geht das mit der Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Mit Keys erzeugt jedes Gebot eine Stripe-Checkout-Session; der Spot wird erst nach bestätigter Zahlung (Webhook) vergeben.

**Bekannte MVP-Grenze:** Wird eine Brand zwischen Checkout-Start und Zahlungseingang überboten, wird die Zahlung nicht angewendet (Warnung im Server-Log) – Erstattung dann manuell über das Stripe-Dashboard.

## Technik

- **Next.js 15** (App Router) + **Tailwind CSS 4** + **TypeScript**
- Persistenz: einfache JSON-Datei unter `data/spot.json` (wird automatisch angelegt, ist gitignored). Für ein Deployment auf Serverless-Plattformen (z.B. Vercel) sollte `src/lib/store.ts` gegen eine echte Datenbank (z.B. Supabase/Postgres) getauscht werden – die gesamte Persistenz steckt in dieser einen Datei.
- API:
  - `GET /api/spot` – aktueller Zustand (Besitzerin, Mindestgebot, Historie, Gesamtsumme)
  - `POST /api/bid` – Gebot abgeben (Demo: sofortige Übernahme / Stripe: Checkout-URL)
  - `POST /api/stripe/webhook` – wendet die Übernahme nach bezahlter Checkout-Session an
