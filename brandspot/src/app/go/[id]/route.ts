import { NextResponse } from "next/server";
import { registerClick } from "@/lib/store";

export const dynamic = "force-dynamic";

// Klick-Tracking: /go/<id> zählt den Klick und leitet zur Brand-Website
// weiter (zur bereinigten URL ohne Query-Parameter).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = await registerClick(id);
  return NextResponse.redirect(url ?? new URL("/", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"), 302);
}
