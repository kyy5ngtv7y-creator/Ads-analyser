import { NextResponse } from "next/server";
import { registerClick } from "@/lib/store";

export const dynamic = "force-dynamic";

// Klick-Beacon: Der Link auf der Seite zeigt direkt (dofollow) auf die
// Brand-Website; dieser Endpoint zählt den Klick nebenbei.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await registerClick(id);
  return NextResponse.json({ ok: true });
}
