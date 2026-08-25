# BrandSpot

Ein Werbeplatz-Bietspiel im Stil von [outbid.lol](https://outbid.lol) – aber für **Brands**, mit Rangliste:

- Jedes Gebot ab **$1** kommt in die Rangliste – man muss **nicht** über dem aktuellen Platz 1 liegen.
- Die Brand mit dem **höchsten Gebot** bekommt den großen Spot ganz oben.
- Bei **gleichem Betrag** gewinnt, wer **zuerst** geboten hat: Bieten 5 Brands je $10, steht die erste davon vorne, die anderen dahinter.
- Jede Brand präsentiert sich mit Name, Botschaft (max. 140 Zeichen), Link, Logo und Farbe.

## Starten

```bash
cd brandspot
npm install
npm run dev
```

Dann [http://localhost:3000](http://localhost:3000) öffnen.

### Demo-Modus (Standard)

Ohne Stripe-Keys läuft alles **ohne echte Zahlung**: Wer das Formular abschickt, landet sofort in der Rangliste. Ideal zum Testen und Vorführen.

### Echte Zahlungen mit Stripe

1. `.env.example` nach `.env.local` kopieren und ausfüllen:
   - `STRIPE_SECRET_KEY` – Secret Key aus dem Stripe-Dashboard
   - `STRIPE_WEBHOOK_SECRET` – Signing Secret des Webhooks
   - `NEXT_PUBLIC_BASE_URL` – öffentliche URL der Seite
2. Im Stripe-Dashboard einen Webhook auf `https://deine-domain/api/stripe/webhook` mit dem Event `checkout.session.completed` anlegen. Lokal geht das mit der Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Mit Keys erzeugt jedes Gebot eine Stripe-Checkout-Session; das Gebot zählt erst nach bestätigter Zahlung (Webhook). Für die Tie-Break-Regel gilt dann der Zahlungszeitpunkt.

## Technik

- **Next.js 15** (App Router) + **Tailwind CSS 4** + **TypeScript**
- Persistenz: einfache JSON-Datei unter `data/spot.json` (wird automatisch angelegt, ist gitignored). Für ein Deployment auf Serverless-Plattformen (z.B. Vercel) sollte `src/lib/store.ts` gegen eine echte Datenbank (z.B. Supabase/Postgres) getauscht werden – die gesamte Persistenz steckt in dieser einen Datei.
- Es werden maximal die 500 bestplatzierten Gebote gespeichert; die Gesamtsumme zählt trotzdem alle.
- API:
  - `GET /api/spot` – sortierte Rangliste, Gesamtsumme, Mindestgebot und Betrag für Platz 1
  - `POST /api/bid` – Gebot abgeben (Demo: sofort in der Rangliste, Antwort enthält den Platz / Stripe: Checkout-URL)
  - `POST /api/stripe/webhook` – nimmt das Gebot nach bezahlter Checkout-Session in die Rangliste auf
