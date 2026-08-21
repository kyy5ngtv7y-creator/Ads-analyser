// Das Bewertungs-Framework: Kriterien, Gewichte, Kontext-Modifikatoren,
// Hard-Caps und die deterministische Score-Aggregation.
// Der Gesamt-Score wird IMMER hier im Code berechnet — nie vom Modell geraten.

import type {
  AdInput,
  CampaignGoal,
  CriterionKey,
  CriterionResult,
  FunnelStage,
  Platform,
  PrimaryMetric,
  Verdict,
} from "../types";

export const FRAMEWORK_VERSION = "1.0.0";

export interface CriterionDef {
  key: CriterionKey;
  label: string;
  baseWeight: number;
  description: string;
}

export const CRITERIA: CriterionDef[] = [
  { key: "hook", label: "Hook / Scroll-Stopper", baseWeight: 20, description: "Stoppt die Ad den Daumen in unter einer Sekunde? Bei Video: Hook in den ersten 3 Sekunden." },
  { key: "clarity", label: "Botschafts-Klarheit", baseWeight: 15, description: "Versteht man in 3 Sekunden, was angeboten wird und für wen? Ein klares Angebot statt fünf." },
  { key: "audience_fit", label: "Zielgruppen-/Awareness-Fit", baseWeight: 15, description: "Passt die Ansprache zu Funnel-Stufe, Awareness-Level und Käufer-Profil?" },
  { key: "copywriting", label: "Copywriting-Qualität", baseWeight: 15, description: "Struktur (Hook→Problem→Lösung→Proof→CTA), Benefits statt Features, Lesbarkeit, Plattform-Länge." },
  { key: "cta", label: "CTA-Stärke", baseWeight: 10, description: "Klare Handlungsaufforderung, konsistent mit Ziel-Event und Angebot." },
  { key: "visual", label: "Visuelle Qualität & Native-Optik", baseWeight: 10, description: "Lesbarkeit, Kontrast, Mobiloptimierung; wirkt es nativ statt wie Werbung?" },
  { key: "trust", label: "Vertrauen & Social Proof", baseWeight: 8, description: "Reviews, UGC-Charakter, Garantien, Autorität." },
  { key: "policy", label: "Plattform-Konformität & Policy", baseWeight: 7, description: "Policy-Fallen (Health-Claims, personalisierte Attribute), Format-Regeln der Plattform." },
];

/**
 * Effektive Gewichte je nach Kampagnenziel und wichtigster Metrik.
 * Brand-Ads: CTA runter, Hook/Visual/Trust rauf. Metrik feinjustiert.
 */
export function effectiveWeights(goal: CampaignGoal, metric: PrimaryMetric): Record<CriterionKey, number> {
  const w: Record<CriterionKey, number> = Object.fromEntries(
    CRITERIA.map((c) => [c.key, c.baseWeight])
  ) as Record<CriterionKey, number>;

  if (goal === "brand") {
    w.cta = 4;
    w.hook += 3;
    w.visual += 2;
    w.trust += 1;
  }
  if (goal === "leads") {
    w.cta += 2;
    w.trust += 1;
    w.policy -= 1;
    w.visual -= 2;
  }

  switch (metric) {
    case "impressions":
    case "awareness":
      w.hook += 2;
      w.visual += 1;
      w.cta = Math.max(3, w.cta - 3);
      break;
    case "sales":
      w.cta += 2;
      w.trust += 1;
      w.hook -= 2;
      w.visual -= 1;
      break;
    case "add_to_cart":
      w.clarity += 2;
      w.visual += 1;
      w.policy -= 1;
      w.trust -= 2;
      break;
    case "checkout":
      w.trust += 3;
      w.cta += 1;
      w.hook -= 3;
      w.visual -= 1;
      break;
  }

  // Normalisieren auf Summe 100
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(w) as CriterionKey[]) {
    w[key] = (w[key] / sum) * 100;
  }
  return w;
}

export interface AppliedCap {
  cap: number;
  reason: string;
}

/**
 * Hard-Caps: schwere Einzel-Fehler deckeln den Gesamt-Score,
 * egal wie gut der Rest ist.
 */
export function hardCaps(input: AdInput, criteria: CriterionResult[]): AppliedCap[] {
  const byKey = new Map(criteria.map((c) => [c.key, c]));
  const caps: AppliedCap[] = [];

  const policy = byKey.get("policy");
  if (policy && policy.score < 30) {
    caps.push({ cap: 40, reason: "Schweres Policy-Risiko — die Ad wird wahrscheinlich abgelehnt oder gefährdet das Werbekonto." });
  }
  const cta = byKey.get("cta");
  if (cta && cta.score < 25 && (input.goal === "sales" || input.goal === "leads")) {
    caps.push({ cap: 60, reason: "Fehlender oder unklarer CTA bei Conversion-/Lead-Ziel." });
  }
  const hook = byKey.get("hook");
  if (hook && hook.score < 20) {
    caps.push({ cap: 50, reason: "Kein erkennbarer Hook — die Ad wird im Feed übersprungen, bevor der Rest wirken kann." });
  }
  const fit = byKey.get("audience_fit");
  if (fit && fit.score < 20) {
    caps.push({ cap: 55, reason: "Ansprache passt nicht zur gewählten Funnel-Stufe." });
  }
  return caps;
}

export function aggregate(
  input: AdInput,
  criteria: CriterionResult[]
): { totalScore: number; verdict: Verdict; appliedCaps: string[] } {
  const weighted = criteria.reduce((acc, c) => acc + (c.score * c.weight) / 100, 0);
  const caps = hardCaps(input, criteria);
  const capped = caps.reduce((score, c) => Math.min(score, c.cap), weighted);
  const totalScore = Math.round(Math.max(0, Math.min(100, capped)));
  return { totalScore, verdict: verdictFor(totalScore), appliedCaps: caps.map((c) => c.reason) };
}

export function verdictFor(score: number): Verdict {
  if (score >= 75) return "winner";
  if (score >= 55) return "solid";
  if (score >= 35) return "risky";
  return "flop";
}

export const VERDICT_META: Record<Verdict, { label: string; advice: string }> = {
  winner: { label: "Winner", advice: "Schalten — hohes Erfolgspotenzial." },
  solid: { label: "Solide", advice: "Schaltbar — mit den Top-Fixes wird mehr daraus." },
  risky: { label: "Riskant", advice: "Erst die kritischen Punkte fixen, dann testen." },
  flop: { label: "Flop", advice: "Nicht schalten — Budget sparen und neu ansetzen." },
};

// ---- Kontext-Beschreibungen für die Bewertung (Prompt + Demo-Engine) ----

export const FUNNEL_EXPECTATIONS: Record<FunnelStage, string> = {
  cold: "Cold Audience: Das Publikum kennt die Brand nicht. Erwartet werden ein starker Pattern-Interrupt-Hook, Problem-/Desire-Ansprache, ausreichende Erklärung des Angebots und Social Proof. Reine Rabatt-/Erinnerungs-Ads sind hier ein Fehler.",
  retargeting: "Retargeting (Besucher/Interaktion): Das Publikum kennt das Angebot bereits. Erwartet werden Einwand-Behandlung, Erinnerung plus Dringlichkeit (Angebot, Deadline) und ein kurzer Weg zur Conversion. Langes Erklären von Grund auf ist hier ein Fehler.",
  customers: "Bestandskunden: Das Publikum hat bereits gekauft. Erwartet werden Cross-/Upsell-Logik, Loyalität und Community-Ton oder Neuheiten. Aggressive Kaltakquise-Ansprache oder Grundlagen-Erklärungen sind hier ein Fehler.",
};

export const OFFER_EXPECTATIONS: Record<string, string> = {
  service: "Service/Dienstleistung: Vertrauen und Autorität sind entscheidend (Ergebnisse, Referenzen, die Person hinter dem Service). Der Weg führt meist über Leads/Erstgespräch, nicht über einen Warenkorb.",
  product: "Eigenes Produkt/Brand: Produkt-Begehrlichkeit, klarer USP/Mechanismus und Markenkonsistenz zählen.",
  dropshipping: "Dropshipping: Wow-Faktor bzw. Problem-Löser-Demo ist entscheidend; Skepsis-Abbau über Social Proof und Garantien. Generische Produktbilder ohne Demo werden abgestraft.",
};

export const PRICE_EXPECTATIONS: Record<string, string> = {
  budget: "Preisklasse günstig: Impuls- und Deal-Framing sind zulässig und oft richtig (Angebot, Dringlichkeit).",
  mid: "Preisklasse mittel: Balance aus Wert-Argumentation und Kaufanreiz.",
  premium: "Preisklasse premium: Wertigkeit, Status und Qualität kommunizieren — Rabattschlacht-Optik oder Billig-Look kosten Punkte.",
};

export const PLATFORM_RULES: Record<Platform, string> = {
  meta: "Meta (Facebook/Instagram): Feed- und Reels-tauglich, Text-Overlays sparsam und lesbar. Policy-Fallen: unbelegte Gesundheits-/Before-After-Claims, Ansprache persönlicher Attribute ('Du bist übergewichtig'), unrealistische Ergebnisversprechen. Primärtext darf länger sein, die ersten 125 Zeichen müssen tragen.",
  tiktok: "TikTok: Muss nativ wirken — UGC-Look, schnelle Schnitte, Sound/Untertitel mitgedacht. Hook in unter 2 Sekunden. Hochglanz-Studio-Optik wird als Werbung weggewischt. Policy: keine unbelegten Wirkversprechen, keine Vorher-Nachher-Körperbilder.",
};

export const METRIC_FOCUS: Record<PrimaryMetric, string> = {
  impressions: "Wichtigste Metrik Impressionen/Reichweite: Thumb-Stop-Rate, Shareability und breite Ansprache zählen am meisten.",
  sales: "Wichtigste Metrik Sales: Kaufmotivation, Angebots-/Preis-Kommunikation, Vertrauen und ein kaufstarker CTA zählen am meisten.",
  add_to_cart: "Wichtigste Metrik Add-to-Cart: Produkt-Begehrlichkeit, klare Produktdarstellung und niedrige Einstiegshürde zählen am meisten.",
  checkout: "Wichtigste Metrik Checkout: Dringlichkeit, Risiko-Umkehr (Garantie/Rückgabe) und Konsistenz zwischen Ad und Angebot zählen am meisten.",
  awareness: "Wichtigste Metrik Bekanntheit: Markenpräsenz, Einprägsamkeit und emotionale Aufladung zählen am meisten.",
};
