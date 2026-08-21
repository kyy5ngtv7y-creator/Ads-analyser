// KI-Vorschlag für ein Käufer-Profil aus der Produktbeschreibung.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ANALYSIS_MODEL, isAiAvailable } from "./analyze";
import type { OfferType, PriceTier } from "../types";

const PersonaSuggestionSchema = z.object({
  name: z.string(),
  demographics: z.string(),
  pains: z.array(z.string()),
  desires: z.array(z.string()),
  objections: z.array(z.string()),
  awarenessLevel: z.string(),
  tone: z.string(),
});

export type PersonaSuggestion = z.infer<typeof PersonaSuggestionSchema>;

export async function suggestPersona(input: {
  projectName: string;
  productDescription: string;
  offerType: OfferType;
  priceTier: PriceTier;
}): Promise<PersonaSuggestion> {
  if (!isAiAvailable()) {
    return {
      name: `Wunschkunde ${input.projectName}`,
      demographics: "Demo-Modus: Beschreibe hier Alter, Situation und Kaufkraft deines besten Käufers.",
      pains: ["Welches Problem hat er/sie, das dein Angebot löst?"],
      desires: ["Welches Ergebnis wünscht er/sie sich wirklich?"],
      objections: ["Zu teuer", "Glaub ich nicht", "Brauch ich (noch) nicht"],
      awarenessLevel: "Problem-aware",
      tone: "Ehrlich, konkret, ohne Marketing-Floskeln",
    };
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system:
      "Du bist ein Zielgruppen-Stratege. Erstelle ein präzises, realistisches Profil des besten Käufers für ein Angebot. Antworte auf Deutsch, konkret statt generisch.",
    messages: [
      {
        role: "user",
        content: `Angebot: ${input.projectName} — ${input.productDescription}. Typ: ${input.offerType}, Preisklasse: ${input.priceTier}.
Erstelle das Profil des wahrscheinlich besten Käufers: prägnanter Name (z.B. "Skincare-Sandra"), Demografie/Situation (1–2 Sätze), 3 Schmerzpunkte, 3 Wünsche, 3 typische Einwände, Awareness-Level (unaware/problem-aware/solution-aware/product-aware) und die Tonalität, auf die diese Person anspricht.`,
      },
    ],
    output_config: { format: zodOutputFormat(PersonaSuggestionSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Persona-Antwort konnte nicht geparst werden.");
  return parsed;
}
