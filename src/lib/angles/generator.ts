// Angle-Generator: erzeugt Marketing-Angles aus Produkt, Ziel, Funnel-Stufe
// und Käufer-Profil — via Claude oder als Demo-Fallback.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ANALYSIS_MODEL, isAiAvailable } from "../ai/analyze";
import { FUNNEL_EXPECTATIONS, OFFER_EXPECTATIONS, PRICE_EXPECTATIONS } from "../scoring/framework";
import type { AngleSuggestion, CampaignGoal, FunnelStage, OfferType, Persona, PriceTier } from "../types";

export const ANGLE_TYPES: { type: string; label: string }[] = [
  { type: "pain_point", label: "Pain-Point" },
  { type: "desire", label: "Desire / Traumzustand" },
  { type: "social_proof", label: "Social Proof" },
  { type: "us_vs_them", label: "Us-vs-Them" },
  { type: "mechanism", label: "Neuheit / Mechanismus" },
  { type: "fomo", label: "Dringlichkeit / FOMO" },
  { type: "price_value", label: "Preis / Wert" },
  { type: "identity", label: "Identität / Status" },
];

export interface AngleRequest {
  projectName: string;
  productDescription: string;
  offerType: OfferType;
  priceTier: PriceTier;
  goal: CampaignGoal;
  funnelStage: FunnelStage;
  persona?: Persona | null;
}

const AngleSchema = z.object({
  angles: z.array(
    z.object({
      type: z.string(),
      typeLabel: z.string(),
      title: z.string(),
      coreMessage: z.string(),
      hooks: z.array(z.string()),
      creativeIdea: z.string(),
      copyStructure: z.string(),
      funnelFit: z.object({
        cold: z.enum(["strong", "ok", "weak"]),
        retargeting: z.enum(["strong", "ok", "weak"]),
        customers: z.enum(["strong", "ok", "weak"]),
      }),
    })
  ),
});

export async function generateAngles(req: AngleRequest): Promise<AngleSuggestion[]> {
  if (!isAiAvailable()) return demoAngles(req);

  const client = new Anthropic();
  const personaBlock = req.persona
    ? `Käufer-Profil: ${req.persona.name} — ${req.persona.demographics}. Pains: ${req.persona.pains.join("; ")}. Wünsche: ${req.persona.desires.join("; ")}. Einwände: ${req.persona.objections.join("; ")}. Ton: ${req.persona.tone}.`
    : "Kein Käufer-Profil hinterlegt — leite eine plausible Zielperson aus dem Produkt ab.";

  const response = await client.messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system:
      "Du bist ein erfahrener Direct-Response-Stratege. Du entwickelst Marketing-Angles für Ads: unterschiedliche psychologische Zugänge zum selben Angebot. Antworte auf Deutsch. Hooks sind konkrete, sofort verwendbare erste Sätze/Einblendungen — keine Beschreibungen. Erfinde keine Zahlen, Bewertungen oder Fakten, die nicht im Input stehen.",
    messages: [
      {
        role: "user",
        content: `Entwickle 6 unterschiedliche Marketing-Angles.

Produkt/Angebot: ${req.projectName} — ${req.productDescription}
${OFFER_EXPECTATIONS[req.offerType]}
${PRICE_EXPECTATIONS[req.priceTier]}
Kampagnenziel: ${req.goal === "sales" ? "Verkauf" : req.goal === "leads" ? "Leads" : "Brand Awareness"}
Geplante Funnel-Stufe: ${FUNNEL_EXPECTATIONS[req.funnelStage]}
${personaBlock}

Nutze 6 verschiedene Angle-Typen aus: ${ANGLE_TYPES.map((t) => `${t.type} (${t.label})`).join(", ")}.
Pro Angle: Titel, Kernbotschaft (1 Satz), 2 konkrete Hooks, eine Creative-Idee (Bild oder Video), empfohlene Copy-Struktur, und die Eignung je Funnel-Stufe (strong/ok/weak für cold, retargeting, customers).`,
      },
    ],
    output_config: { format: zodOutputFormat(AngleSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Angle-Antwort konnte nicht geparst werden.");
  return parsed.angles as AngleSuggestion[];
}

/** Demo-Angles ohne API-Key: schablonenbasiert aus Produkt + Persona. */
export function demoAngles(req: AngleRequest): AngleSuggestion[] {
  const p = req.persona;
  const pain = p?.pains[0] ?? "das Problem, das dein Produkt löst";
  const desire = p?.desires[0] ?? "das Ergebnis, das sich deine Kunden wünschen";
  const objection = p?.objections[0] ?? "der häufigste Einwand deiner Kunden";
  const name = req.projectName;

  return [
    {
      type: "pain_point",
      typeLabel: "Pain-Point",
      title: `Das Problem direkt benennen`,
      coreMessage: `${pain} — und ${name} als der Ausweg.`,
      hooks: [`${pain}? Dann lies das hier.`, `Ich dachte, ${pain.toLowerCase()} sei normal. War es nicht.`],
      creativeIdea: "Talking-Head oder Text-Overlay, das das Problem in Sekunde 1 benennt; danach die Lösung zeigen.",
      copyStructure: "Hook (Pain) → Verstärkung → Lösung → Proof → CTA",
      funnelFit: { cold: "strong", retargeting: "ok", customers: "weak" },
    },
    {
      type: "desire",
      typeLabel: "Desire / Traumzustand",
      title: "Den Wunschzustand zeigen",
      coreMessage: `Nicht das Produkt verkaufen, sondern: ${desire}.`,
      hooks: [`Stell dir vor: ${desire}.`, `So fühlt sich ${desire.toLowerCase()} an.`],
      creativeIdea: "Ergebnis-Szene ohne Studio-Optik: der Moment, in dem das Ziel erreicht ist.",
      copyStructure: "Traumzustand → Brücke zum Produkt → Beleg → CTA",
      funnelFit: { cold: "ok", retargeting: "strong", customers: "strong" },
    },
    {
      type: "social_proof",
      typeLabel: "Social Proof",
      title: "Andere haben es schon getan",
      coreMessage: `Echte Stimmen entkräften Skepsis gegenüber ${name}.`,
      hooks: ["Das sagen Leute, die es wirklich benutzt haben:", "Ich war skeptisch. Dann habe ich die Bewertungen gelesen."],
      creativeIdea: "Review-Collage oder UGC-Testimonial; echte Kundenstimme als Voiceover. Nutze nur Proof, den du wirklich hast.",
      copyStructure: "Proof-Hook → Story eines Kunden → Ergebnis → CTA",
      funnelFit: { cold: "strong", retargeting: "strong", customers: "ok" },
    },
    {
      type: "mechanism",
      typeLabel: "Neuheit / Mechanismus",
      title: "Warum es diesmal anders ist",
      coreMessage: `Der Mechanismus hinter ${name} erklärt in einem Satz, warum es funktioniert.`,
      hooks: ["Der Grund, warum nichts davon funktioniert hat: Du hast das falsche Problem gelöst.", `So funktioniert ${name} wirklich — in 20 Sekunden.`],
      creativeIdea: "Kurze Demo/Erklärgrafik: Problem-Mechanik links, Lösungs-Mechanik rechts.",
      copyStructure: "Neugier-Hook → Mechanismus → Abgrenzung → CTA",
      funnelFit: { cold: "strong", retargeting: "ok", customers: "ok" },
    },
    {
      type: "price_value",
      typeLabel: "Preis / Wert",
      title: "Den Einwand frontal nehmen",
      coreMessage: `„${objection}“ — direkt adressieren statt umschiffen.`,
      hooks: [`„${objection}“ — verstehen wir. Deshalb hier die Rechnung:`, "Rechne zusammen, was dich die Alternativen bisher gekostet haben."],
      creativeIdea: "Split-Screen: Kosten des Nicht-Handelns vs. Investition; bei Premium Wertigkeit statt Rabatt zeigen.",
      copyStructure: "Einwand-Hook → Reframe → Wert-Beleg → risikofreier CTA",
      funnelFit: { cold: "ok", retargeting: "strong", customers: "ok" },
    },
    {
      type: "identity",
      typeLabel: "Identität / Status",
      title: "Für Leute, die …",
      coreMessage: `${name} als Zeichen dafür, wer man ist — nicht nur, was man kauft.`,
      hooks: ["Es gibt zwei Sorten von Leuten. Die einen warten, die anderen handeln.", `Für alle, die ${desire.toLowerCase()} nicht dem Zufall überlassen.`],
      creativeIdea: "Lifestyle-Szene mit klarer Zielgruppen-Codierung; Brand sichtbar, Ton selbstbewusst.",
      copyStructure: "Identitäts-Hook → Zugehörigkeit → Produkt als Werkzeug → CTA",
      funnelFit: { cold: "ok", retargeting: "ok", customers: "strong" },
    },
  ];
}
