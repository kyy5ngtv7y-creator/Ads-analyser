export type Bid = {
  id: string;
  brand: string;
  message: string;
  url: string | null;
  imageUrl: string | null;
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
