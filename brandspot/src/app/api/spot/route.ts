import { NextResponse } from "next/server";
import { getSpotState } from "@/lib/store";
import { stripeEnabled } from "@/lib/stripe";
import {
  rankBids,
  START_PRICE_CENTS,
  toBeatCents,
  type PublicSpot,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// Online-Zähler: Jeder offene Tab pollt alle 5 s mit einer zufälligen
// Client-ID; wer in den letzten 30 s gepollt hat, zählt als online.
// (In-Memory – bei mehreren Server-Instanzen bräuchte das einen Shared Store.)
const ONLINE_WINDOW_MS = 30_000;
const lastSeen = new Map<string, number>();

function trackOnline(clientId: string | null): number {
  const now = Date.now();
  if (clientId && /^[a-z0-9-]{1,64}$/i.test(clientId)) {
    lastSeen.set(clientId, now);
  }
  let online = 0;
  for (const [id, ts] of lastSeen) {
    if (now - ts > ONLINE_WINDOW_MS) lastSeen.delete(id);
    else online++;
  }
  return Math.max(online, 1);
}

export async function GET(request: Request) {
  const state = await getSpotState();
  const clientId = new URL(request.url).searchParams.get("c");
  const body: PublicSpot = {
    bids: rankBids(state.bids),
    totalRaisedCents: state.totalRaisedCents,
    visitors: state.visitors,
    online: trackOnline(clientId),
    minBidCents: START_PRICE_CENTS,
    toBeatCents: toBeatCents(state.bids),
    demoMode: !stripeEnabled(),
  };
  return NextResponse.json(body);
}
