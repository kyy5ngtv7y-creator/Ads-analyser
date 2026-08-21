// Preis- und Limit-Konfiguration (CHF). Ohne Code-Änderung anpassbar.

export interface Plan {
  id: "trial" | "standard" | "pro";
  name: string;
  priceChf: number;
  analysesPerMonth: number;
  perAnalysisChf: number | null;
  features: string[];
}

export const TRIAL_DAYS = 3;
export const TRIAL_ANALYSES = 3;

export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Gratis-Trial",
    priceChf: 0,
    analysesPerMonth: TRIAL_ANALYSES,
    perAnalysisChf: null,
    features: [`${TRIAL_ANALYSES} Analysen inklusive`, `${TRIAL_DAYS} Tage voller Zugang`, "Alle Funktionen testbar"],
  },
  {
    id: "standard",
    name: "Standard",
    priceChf: 40,
    analysesPerMonth: 20,
    perAnalysisChf: 2.0,
    features: ["20 Analysen pro Monat", "Meta + TikTok · Bild + Video", "Käufer-Profile + Angle-Finder"],
  },
  {
    id: "pro",
    name: "Pro",
    priceChf: 120,
    analysesPerMonth: 240,
    perAnalysisChf: 0.5,
    features: ["240 Analysen pro Monat", "Alles aus Standard", "A/B-Vergleich + PDF-Reports für Kunden"],
  },
];
