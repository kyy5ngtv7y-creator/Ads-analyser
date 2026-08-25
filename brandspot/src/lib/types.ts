export type LocationType = "online" | "physical" | "both";

export const CATEGORIES = [
  "Gastro",
  "Fashion",
  "Tech",
  "Shop",
  "Beauty",
  "Fitness",
  "Service",
  "Sonstiges",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Bid = {
  id: string;
  brand: string;
  message: string;
  category: Category;
  locationType: LocationType;
  address: string | null;
  country: string | null;
  url: string | null;
  logo: string | null; // http(s)-URL oder data:image-URI (Upload)
  color: string;
  amountCents: number;
  createdAt: string;
};

export type SpotState = {
  bids: Bid[];
  totalRaisedCents: number;
};

export type PublicSpot = {
  bids: Bid[]; // absteigend sortiert: höchster Betrag zuerst, bei Gleichstand das ältere Gebot
  totalRaisedCents: number;
  minBidCents: number;
  toBeatCents: number; // ab diesem Betrag ist man sicher auf Platz 1
  demoMode: boolean;
};

export const START_PRICE_CENTS = 100;
export const MAX_BID_CENTS = 100_000_000;

// Chat- und Invite-Links sind nicht erlaubt – die Liste ist für Produkte
// und Orte, nicht für Gruppenchats.
const BLOCKED_HOSTS = new Set([
  "t.me",
  "telegram.me",
  "wa.me",
  "chat.whatsapp.com",
  "discord.gg",
  "m.me",
  "signal.me",
  "signal.group",
]);

/** Entfernt Query-Parameter und Fragmente (Affiliate-/Tracking-URLs funktionieren nicht). */
export function cleanUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function isBlockedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (BLOCKED_HOSTS.has(host)) return true;
    const path = u.pathname.toLowerCase();
    if (
      (host === "discord.com" || host === "discordapp.com") &&
      path.startsWith("/invite")
    )
      return true;
    if (host === "whatsapp.com" && path.startsWith("/invite")) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * Einträge sind über ihre Website verknüpft (Host + Pfad, ohne www und
 * Query-Parameter) – dieselbe Website erneut eintragen erhöht den
 * bestehenden Eintrag. Ohne Website zählt der Brand-Name.
 */
export function listingKeyFor(url: string | null, brand: string): string {
  if (url) {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      const path = u.pathname.replace(/\/+$/, "");
      return `url:${host}${path}`;
    } catch {
      // fällt auf den Brand-Namen zurück
    }
  }
  return `brand:${brand.trim().toLowerCase()}`;
}

/**
 * Rangfolge: höchster Betrag zuerst. Bei gleichem Betrag gewinnt,
 * wer zuerst geboten hat (älteres Gebot steht weiter oben).
 */
export function rankBids(bids: Bid[]): Bid[] {
  return [...bids].sort((a, b) => {
    if (b.amountCents !== a.amountCents) return b.amountCents - a.amountCents;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

export function toBeatCents(bids: Bid[]): number {
  const top = rankBids(bids)[0];
  return top ? top.amountCents + START_PRICE_CENTS : START_PRICE_CENTS;
}

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
