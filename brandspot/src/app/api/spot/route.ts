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

export async function GET() {
  const state = await getSpotState();
  const body: PublicSpot = {
    bids: rankBids(state.bids),
    totalRaisedCents: state.totalRaisedCents,
    minBidCents: START_PRICE_CENTS,
    toBeatCents: toBeatCents(state.bids),
    demoMode: !stripeEnabled(),
  };
  return NextResponse.json(body);
}
