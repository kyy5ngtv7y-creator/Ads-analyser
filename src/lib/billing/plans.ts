// Preis- und Limit-Konfiguration (CHF). Ohne Code-Änderung anpassbar.

export interface Plan {
  id: "trial" | "standard" | "pro" | "agency";
  name: string;
  priceChf: number;
  /** Monatspreis bei jährlicher Zahlung (−20 %). null = kein Jahresplan. */
  yearlyMonthlyChf: number | null;
  analysesPerMonth: number;
  perAnalysisChf: number | null;
  features: string[];
}

export const TRIAL_DAYS = 3;
export const TRIAL_ANALYSES = 3;
export const YEARLY_DISCOUNT_PCT = 20;

export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Gratis-Trial",
    priceChf: 0,
    yearlyMonthlyChf: null,
    analysesPerMonth: TRIAL_ANALYSES,
    perAnalysisChf: null,
    features: [`${TRIAL_ANALYSES} Analysen inklusive`, `${TRIAL_DAYS} Tage voller Zugang`, "Alle Funktionen testbar"],
  },
  {
    id: "standard",
    name: "Standard",
    priceChf: 40,
    yearlyMonthlyChf: 32,
    analysesPerMonth: 20,
    perAnalysisChf: 2.0,
    features: ["20 Analysen pro Monat", "Meta + TikTok, Bild + Video", "Käufer-Profile + Angle-Finder"],
  },
  {
    id: "pro",
    name: "Pro",
    priceChf: 120,
    yearlyMonthlyChf: 96,
    analysesPerMonth: 240,
    perAnalysisChf: 0.5,
    features: ["240 Analysen pro Monat", "Alles aus Standard", "A/B-Vergleich + PDF-Reports"],
  },
  {
    id: "agency",
    name: "Agency",
    priceChf: 290,
    yearlyMonthlyChf: 232,
    analysesPerMonth: 700,
    perAnalysisChf: 0.41,
    features: ["700 Analysen pro Monat", "Alles aus Pro", "Kunden-Workspaces (bald)", "White-Label-Reports (bald)"],
  },
];

export function planById(id: Plan["id"]): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
