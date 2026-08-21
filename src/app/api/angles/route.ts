import { NextRequest, NextResponse } from "next/server";
import { generateAngles, type AngleRequest } from "@/lib/angles/generator";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AngleRequest;
    if (!body.productDescription) {
      return NextResponse.json({ error: "Produktbeschreibung fehlt." }, { status: 400 });
    }
    const angles = await generateAngles(body);
    return NextResponse.json({ angles });
  } catch (err) {
    console.error("angles failed", err);
    const message = err instanceof Error ? err.message : "Angle-Generierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
