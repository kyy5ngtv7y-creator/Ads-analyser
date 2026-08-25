import { NextResponse } from "next/server";
import { getSpotState } from "@/lib/store";
import { stripeEnabled } from "@/lib/stripe";
import { minNextBidCents, type PublicSpot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getSpotState();
  const body: PublicSpot = {
    ...state,
    minNextBidCents: minNextBidCents(state),
    demoMode: !stripeEnabled(),
  };
  return NextResponse.json(body);
}
