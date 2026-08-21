// Baut die Analyse-Prompts aus dem Ad-Kontext.

import type { AdInput, Platform } from "../types";
import {
  CRITERIA,
  FUNNEL_EXPECTATIONS,
  METRIC_FOCUS,
  OFFER_EXPECTATIONS,
  PLATFORM_RULES,
  PRICE_EXPECTATIONS,
} from "./framework";

export const ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Performance-Marketing-Analyst. Du bewertest Werbeanzeigen (Creative + Copy) VOR dem Schalten anhand eines festen Kriterienkatalogs.

Regeln:
- Bewerte jedes Kriterium einzeln mit 0–100 und einer kurzen, konkreten Begründung auf Deutsch.
- Sei streng und ehrlich: Eine mittelmäßige Ad bekommt mittelmäßige Werte. 80+ nur für wirklich Starkes, unter 40 für klare Schwächen.
- Begründungen beziehen sich auf DIESE Ad (zitiere konkrete Formulierungen oder Bildelemente), nie generisch.
- Verbesserungen müssen umsetzbar sein: konkrete Formulierung oder konkrete Änderung am Creative.
- Copy-Rewrites bleiben in der Sprache der Original-Copy und beim Angebot des Werbetreibenden. Erfinde keine Fakten, Zahlen oder Bewertungen, die nicht im Input stehen.
- Du vergibst KEINEN Gesamt-Score — der wird extern aus deinen Kriterien-Werten berechnet.`;

export function buildAnalysisPrompt(input: AdInput, platform: Platform): string {
  const parts: string[] = [];

  parts.push(`## Kontext der Kampagne
- Projekt/Brand: ${input.projectName}
- Produkt/Angebot: ${input.productDescription}
- Angebots-Typ: ${OFFER_EXPECTATIONS[input.offerType]}
- ${PRICE_EXPECTATIONS[input.priceTier]}
- Kampagnenziel: ${input.goal === "sales" ? "Verkauf/Conversion" : input.goal === "leads" ? "Leads generieren" : "Marke aufziehen / Brand Awareness"}
- ${METRIC_FOCUS[input.primaryMetric]}
- Funnel-Stufe: ${FUNNEL_EXPECTATIONS[input.funnelStage]}
- Plattform-Regelwerk: ${PLATFORM_RULES[platform]}
- Format: ${input.format === "video" ? `Video (${input.videoDurationSec ?? "?"}s, Keyframes beigefügt)` : "Statisches Bild"}`);

  if (input.persona) {
    parts.push(`## Käufer-Profil (Wunschkunde)
- Name: ${input.persona.name}
- Wer: ${input.persona.demographics}
- Awareness-Level: ${input.persona.awarenessLevel}
- Schmerzpunkte: ${input.persona.pains.join("; ")}
- Wünsche: ${input.persona.desires.join("; ")}
- Einwände: ${input.persona.objections.join("; ")}
- Tonalität des Kunden: ${input.persona.tone}
Prüfe beim Kriterium audience_fit ausdrücklich: Trifft die Ad die Pains/Wünsche dieses Menschen, und entkräftet sie mindestens einen Einwand?`);
  }

  parts.push(`## Die Copy der Ad
- Headline: ${input.copy.headline || "(keine)"}
- Primärtext: ${input.copy.primaryText || "(keiner)"}
- CTA: ${input.copy.cta || "(keiner)"}`);

  parts.push(`## Kriterien (bewerte jedes mit 0–100)
${CRITERIA.map((c) => `- ${c.key}: ${c.label} — ${c.description}`).join("\n")}`);

  parts.push(`Bewerte die Ad für die Plattform ${platform === "meta" ? "Meta (Facebook/Instagram)" : "TikTok"}. Liefere außerdem: eine 2-Satz-Zusammenfassung, plattformspezifischen Rat, die 3 wichtigsten priorisierten Verbesserungen und je 2 Rewrites für Headline und CTA (bzw. Primärtext, wenn keine Headline vorhanden ist).`);

  return parts.join("\n\n");
}
