// Demo-Engine: deterministische Heuristik-Bewertung ohne API-Key.
// Liefert plausible, kontextabhängige Ergebnisse, damit die App ohne
// ANTHROPIC_API_KEY vollständig ausprobierbar ist. Mit Key übernimmt Claude.

import type { RawAnalysisOutput } from "../ai/analyze";
import type { AdInput, Platform } from "../types";

const CTA_BUY = ["jetzt kaufen", "jetzt shoppen", "jetzt bestellen", "shop now", "buy now", "jetzt sichern", "zum angebot"];
const CTA_LEAD = ["jetzt sichern", "gratis", "kostenlos", "termin", "anfragen", "mehr erfahren", "download", "eintragen", "buchen"];
const HOOK_SIGNALS = ["?", "du ", "dein", "stopp", "endlich", "schluss", "warum", "geheim", "fehler", "niemand", "stell dir vor", "kennst du"];
const PROOF_SIGNALS = ["bewertung", "sterne", "★", "kunden", "erfahrung", "review", "getestet", "studie", "garantie", "geld-zurück"];
const URGENCY_SIGNALS = ["nur noch", "heute", "limitiert", "endet", "letzte chance", "solange", "rabatt", "%"];
const RISKY_CLAIMS = ["heilt", "garantiert abnehmen", "jünger", "wunder", "sofort reich", "ohne risiko", "100%", "nie wieder"];
const DISCOUNT_SIGNALS = ["rabatt", "%", "sale", "deal", "billig", "gratis"];

function clamp(n: number): number {
  return Math.max(5, Math.min(96, Math.round(n)));
}

/** Kleiner deterministischer Jitter aus dem Input, damit Ergebnisse lebendig, aber reproduzierbar sind. */
function jitter(seedText: string, key: string, range = 6): number {
  let h = 0;
  const s = seedText + key;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % (range * 2 + 1)) - range;
}

function includesAny(text: string, needles: string[]): number {
  return needles.filter((n) => text.includes(n)).length;
}

export function analyzeDemo(input: AdInput, platform: Platform): RawAnalysisOutput {
  const all = `${input.copy.headline} ${input.copy.primaryText} ${input.copy.cta}`.toLowerCase();
  const head = `${input.copy.headline} ${input.copy.primaryText.slice(0, 120)}`.toLowerCase();
  const seed = all + platform + input.funnelStage + input.goal + input.primaryMetric;
  const words = all.trim().split(/\s+/).filter(Boolean).length;

  // --- Hook ---
  let hook = 45 + includesAny(head, HOOK_SIGNALS) * 9;
  if (input.copy.headline.length > 0 && input.copy.headline.length <= 60) hook += 6;
  if (input.format === "video" && platform === "tiktok") hook -= 6; // Hook-Timing unbekannt → konservativ
  hook += jitter(seed, "hook");

  // --- Klarheit ---
  let clarity = 62;
  if (words < 8) clarity -= 18;
  if (words > 160) clarity -= 12;
  if (input.copy.headline) clarity += 6;
  if (input.productDescription.length > 40) clarity += 4;
  clarity += jitter(seed, "clarity");

  // --- Zielgruppen-/Funnel-Fit ---
  let fit = 55;
  const urgency = includesAny(all, URGENCY_SIGNALS);
  const proof = includesAny(all, PROOF_SIGNALS);
  const explains = words > 40;
  if (input.funnelStage === "cold") {
    fit += (explains ? 8 : -8) + proof * 4 + (urgency > 1 ? -6 : 0);
  } else if (input.funnelStage === "retargeting") {
    fit += urgency * 6 + (explains ? -6 : 6);
  } else {
    fit += (urgency > 1 ? -10 : 4) + (includesAny(all, ["neu", "exklusiv", "danke", "community", "vip"]) ? 8 : -4);
  }
  if (input.persona) {
    const personaTerms = [...input.persona.pains, ...input.persona.desires]
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const hits = personaTerms.filter((t) => all.includes(t)).length;
    fit += hits > 0 ? Math.min(12, hits * 4) : -6;
  }
  fit += jitter(seed, "fit");

  // --- Copywriting ---
  let copy = 50 + proof * 4;
  if (words >= 25 && words <= 120) copy += 8;
  if (includesAny(all, ["wir sind", "unser unternehmen", "seit 19", "seit 20"]) > 0) copy -= 8; // Wir-Fokus statt Kunde
  if ((all.match(/!/g) || []).length > 3) copy -= 6;
  copy += jitter(seed, "copy");

  // --- CTA ---
  const wantsBuy = input.goal === "sales";
  let cta = 30;
  const hasBuyCta = includesAny(all, CTA_BUY) > 0;
  const hasLeadCta = includesAny(all, CTA_LEAD) > 0;
  if (input.copy.cta.trim().length > 0) cta += 18;
  if (wantsBuy && hasBuyCta) cta += 28;
  if (wantsBuy && !hasBuyCta && hasLeadCta) cta += 8; // CTA da, aber zu weich fürs Kauf-Ziel
  if (input.goal === "leads" && hasLeadCta) cta += 26;
  if (input.goal === "brand") cta = 60 + (input.copy.cta ? 10 : 0); // Brand braucht keinen harten CTA
  cta += jitter(seed, "cta");

  // --- Visual (ohne Bildanalyse: Format-/Plattform-Heuristik) ---
  let visual = 58;
  if (input.creativeFrames.length > 0) visual += 8;
  if (platform === "tiktok" && input.format === "image") visual -= 10; // statisch auf TikTok
  if (input.priceTier === "premium" && includesAny(all, DISCOUNT_SIGNALS) > 1) visual -= 10;
  visual += jitter(seed, "visual");

  // --- Trust ---
  let trust = 38 + proof * 12 + includesAny(all, ["garantie", "geld-zurück", "rückgabe"]) * 8;
  if (input.offerType === "dropshipping" && proof === 0) trust -= 12;
  if (input.offerType === "service" && includesAny(all, ["ergebnis", "kunden", "referenz", "fallstudie"]) === 0) trust -= 8;
  trust += jitter(seed, "trust");

  // --- Policy ---
  const risky = includesAny(all, RISKY_CLAIMS);
  let policy = 82 - risky * 24;
  if (platform === "tiktok" && includesAny(all, ["vorher", "nachher", "abnehmen"]) > 0) policy -= 15;
  policy += jitter(seed, "policy", 4);

  const scores = {
    hook: clamp(hook),
    clarity: clamp(clarity),
    audience_fit: clamp(fit),
    copywriting: clamp(copy),
    cta: clamp(cta),
    visual: clamp(visual),
    trust: clamp(trust),
    policy: clamp(policy),
  };

  const reasoningMap: Record<string, string> = {
    hook: scores.hook >= 65 ? "Der Einstieg hat erkennbare Stopper-Elemente (direkte Ansprache/Frage) und eine tragfähige Headline." : "Der Einstieg ist austauschbar — kein Pattern-Interrupt, der im Feed stoppt. Die ersten Worte müssen härter arbeiten.",
    clarity: scores.clarity >= 65 ? "Angebot und Zielgruppe sind schnell erfassbar." : words < 8 ? "Zu wenig Substanz — in 3 Sekunden bleibt unklar, was genau angeboten wird." : "Die Botschaft verliert sich — ein Angebot, ein Versprechen, der Rest fliegt raus.",
    audience_fit: scores.audience_fit >= 65 ? `Ansprache passt zur Funnel-Stufe (${input.funnelStage === "cold" ? "Cold: erklärt und belegt" : input.funnelStage === "retargeting" ? "Retargeting: erinnert mit Dringlichkeit" : "Bestandskunden: passender Ton"}).` : input.funnelStage === "cold" ? "Für Cold Audience fehlt Erklärung oder Beleg — das Publikum kennt dich noch nicht." : input.funnelStage === "retargeting" ? "Für Retargeting fehlt der Anstoß: Einwand-Behandlung oder ein konkreter Grund, jetzt zurückzukommen." : "Für Bestandskunden wirkt die Ansprache wie Kaltakquise — Loyalität/Upsell-Logik fehlt.",
    copywriting: scores.copywriting >= 65 ? "Struktur und Länge stimmen, Nutzen steht im Vordergrund." : "Die Copy folgt keiner klaren Struktur (Hook→Problem→Lösung→Proof→CTA) oder redet über den Absender statt über den Kunden.",
    cta: scores.cta >= 65 ? "Der CTA passt zum Ziel-Event." : wantsBuy ? "Der CTA ist zu weich für ein Sales-Ziel — er muss zum Kauf führen, nicht zum Stöbern." : "Der CTA ist unklar oder fehlt — die gewünschte Handlung muss explizit sein.",
    visual: scores.visual >= 65 ? "Creative-Setup passt zur Plattform." : platform === "tiktok" ? "Für TikTok zu wenig nativ — UGC-Look und Bewegung schlagen Studio-Optik." : "Das Creative braucht mehr Kontrast/Lesbarkeit für den mobilen Feed.",
    trust: scores.trust >= 65 ? "Vertrauens-Elemente (Proof/Garantie) sind vorhanden." : "Es fehlen Belege: Bewertungen, Zahlen, Garantie oder echte Kundenstimmen.",
    policy: scores.policy >= 65 ? "Keine offensichtlichen Policy-Risiken erkannt." : "Formulierungen mit Ablehnungsrisiko erkannt — unbelegte Versprechen entschärfen.",
  };

  const improvements = Object.entries(scores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, score], i) => ({
      priority: i + 1,
      title: {
        hook: "Hook schärfen",
        clarity: "Botschaft fokussieren",
        audience_fit: "Ansprache an Funnel-Stufe anpassen",
        copywriting: "Copy-Struktur aufbauen",
        cta: "CTA aufs Ziel-Event ausrichten",
        visual: "Creative plattformgerecht machen",
        trust: "Social Proof ergänzen",
        policy: "Riskante Claims entschärfen",
      }[key]!,
      detail: reasoningMap[key]!,
      expectedImpact: score < 40 ? "Hoher Hebel" : "Mittlerer Hebel",
    }));

  const wantHard = input.goal === "sales";
  return {
    criteria: (Object.keys(scores) as (keyof typeof scores)[]).map((key) => ({
      key,
      score: scores[key],
      reasoning: reasoningMap[key]!,
      finding: null,
    })),
    summary:
      scores.hook + scores.audience_fit >= 130
        ? "Die Ad hat eine tragfähige Basis für ihre Funnel-Stufe; die unten priorisierten Fixes holen die restlichen Punkte."
        : "Die Ad hat strukturelle Schwächen für diesen Kontext — erst die Top-Fixes umsetzen, dann Budget investieren.",
    platformAdvice:
      platform === "tiktok"
        ? "Für TikTok: Hook in unter 2 Sekunden, nativer UGC-Look, Untertitel für Ton-aus-Nutzer."
        : "Für Meta: Die ersten 125 Zeichen des Primärtexts müssen alleine tragen; Creative auf 9:16 und 1:1 testen.",
    improvements,
    rewrites: [
      {
        field: "headline" as const,
        label: "Pain-Fokus",
        original: input.copy.headline || input.copy.primaryText.slice(0, 60),
        rewritten: input.persona?.pains[0]
          ? `${input.persona.pains[0]}? Genau dafür gibt es ${input.projectName}.`
          : `Schluss mit Raten: So löst ${input.projectName} dein Problem.`,
      },
      {
        field: "cta" as const,
        label: wantHard ? "Kaufstark" : "Niedrige Hürde",
        original: input.copy.cta || "(kein CTA)",
        rewritten: wantHard ? "Jetzt shoppen — 30 Tage risikofrei testen" : input.goal === "leads" ? "Jetzt gratis sichern" : `${input.projectName} entdecken`,
      },
    ],
  };
}
