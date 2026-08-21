# Ads·Analyser

**Weiss in 60 Sekunden, ob deine Ad ein Winner wird — oder floppt.**

Ads·Analyser bewertet Meta- (Facebook/Instagram) und TikTok-Ads **vor dem Schalten**: Creative (Bild/Video) plus Copy werden nach einem festen, gewichteten Kriterienkatalog analysiert. Ergebnis ist ein **Winner-Score in Prozent** mit Verdict (Winner / Solide / Riskant / Flop), Teilscores pro Kriterium, priorisierten Fixes und fertigen Copy-Rewrites.

Das Design der Screens liegt als Canvas unter `design/` (Artefakt „Ads·Analyser Screens").

## Was drin ist

- **Analyse-Wizard (8 Schritte):** Projekt & Plattform (Meta / TikTok / beide) → Angebots-Typ (Service / Eigenes Produkt / Dropshipping) + Preisklasse → Kampagnenziel (Verkaufen / Leads / Marke aufbauen) + wichtigste Metrik (Impressionen / Sales / Add-to-Cart / Checkout / Bekanntheit) → Funnel-Stufe (Cold / Retargeting / Bestandskunden) → Käufer-Profil → Creative-Upload → Copy → Analyse.
- **Scoring-Framework** (`src/lib/scoring/framework.ts`): 8 Kriterien mit Gewichten (Hook 20 %, Klarheit 15 %, Zielgruppen-Fit 15 %, Copywriting 15 %, CTA 10 %, Visual 10 %, Vertrauen 8 %, Policy 7 %), kontextabhängige Gewichts-Verschiebung nach Ziel/Metrik, **Hard-Caps** (z. B. schweres Policy-Risiko ⇒ Score max. 40). Der Gesamt-Score wird **deterministisch im Code** aggregiert — das Modell liefert nur Teilbewertungen.
- **Claude-Analyse** (`src/lib/ai/analyze.ts`): Vision-Analyse der Creative-Frames + Copy via Structured Output. **Ohne `ANTHROPIC_API_KEY` läuft ein Demo-Modus** mit deterministischer Heuristik (`src/lib/scoring/demo.ts`), damit die App sofort ausprobierbar ist.
- **Video-Support:** Keyframes (Sekunde 0/1/3, Mitte, Ende) werden **clientseitig** per `<video>`+Canvas extrahiert (`src/lib/video.ts`) — kein ffmpeg nötig, Vercel-tauglich.
- **Käufer-Profile:** Wunschkunden-Avatar mit Pains, Wünschen, Einwänden (KI-Vorschlag aus der Produktbeschreibung). Die Analyse prüft gezielt, ob die Ad diese Person trifft.
- **Angle-Finder:** 6 Marketing-Angles (Pain-Point, Desire, Social Proof, Mechanismus, Preis/Wert, Identität …) aus Produkt + Ziel + Funnel-Stufe + Persona, jeweils mit Hooks, Creative-Idee und Funnel-Eignung — übernehmbar in den Wizard.
- **A/B-Vergleich, Historie, Dashboard, Trial/Paywall** (3 Gratis-Analysen + 3 Tage; Standard 40.– CHF/20 Analysen ≈ 2.00, Pro 120.– CHF/240 Analysen ≈ 0.50).

## Starten

```bash
npm install
cp .env.example .env.local   # optional: ANTHROPIC_API_KEY eintragen
npm run dev                  # http://localhost:3000
```

Ohne Key: Demo-Modus (im Ergebnis als solcher markiert). Mit Key: echte Claude-Analyse.

## Architektur / Stand der Phasen

| Phase | Inhalt | Stand |
|---|---|---|
| 1 | Scoring-Engine, Wizard, Ergebnis-Seite, Bild + Video, Meta + TikTok | ✅ umgesetzt |
| 2 | Accounts + DB + Storage via Supabase | 🔜 vorbereitet: `db/schema.sql` (inkl. RLS), env-Platzhalter. Ersetzt `src/lib/store.ts` (localStorage) |
| 3 | TikTok-/Video-Feinschliff (Pacing-/Untertitel-Analyse mit Transkript) | teilweise (Keyframes + TikTok-Regelwerk aktiv) |
| 4 | Stripe: Abos Standard/Pro, Limits serverseitig, Kundenportal | 🔜 vorbereitet: `src/lib/billing/plans.ts`, Paywall-UI vorhanden (Planwahl aktuell lokal) |
| 5 | PDF-Reports (aktuell Browser-Print), Copy-Generator | teilweise |
| 6 | Feedback-Loop: echte Ad-Ergebnisse (`ad_results`) → Kalibrierung der Gewichte | 🔜 Tabelle im Schema |

Wichtige Pfade:

```
src/lib/scoring/   framework.ts (Kriterien/Gewichte/Caps, versioniert) · prompts.ts · engine.ts · demo.ts
src/lib/ai/        analyze.ts (Claude + Structured Output) · persona.ts
src/lib/angles/    generator.ts (Angle-Typen + Generator)
src/lib/billing/   plans.ts (Preise/Limits in CHF — ohne Code-Änderung anpassbar)
src/app/api/       analyze · angles · persona-suggest
src/app/(app)/     dashboard · analyze (Wizard) · analysis/[id] · personas · angles · history · compare · settings
db/schema.sql      Postgres-Schema für Supabase (Phase 2)
design/            Design-Canvas (7 Screens, .dc.html)
```

## Tests / Verifikation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Fachliche Checks (siehe Plan): dieselbe Ad als „Cold" vs. „Bestandskunden" analysieren ⇒ Zielgruppen-Fit und Begründung unterscheiden sich; Ziel „Sales" vs. „Bekanntheit" ⇒ Gewichte verschieben sich; Plattform „beide" ⇒ zwei Scores + Vergleich.
