export type Takeover = {
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
  current: Takeover | null;
  history: Takeover[];
  totalRaisedCents: number;
};

export type PublicSpot = SpotState & {
  minNextBidCents: number;
  demoMode: boolean;
};

export const START_PRICE_CENTS = 100;
export const MIN_INCREMENT_CENTS = 100;
export const MAX_BID_CENTS = 100_000_000;

export function minNextBidCents(state: SpotState): number {
  return state.current
    ? state.current.amountCents + MIN_INCREMENT_CENTS
    : START_PRICE_CENTS;
}

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
