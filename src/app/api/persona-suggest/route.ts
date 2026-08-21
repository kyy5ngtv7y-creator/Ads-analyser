import { NextRequest, NextResponse } from "next/server";
import { suggestPersona } from "@/lib/ai/persona";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.productDescription) {
      return NextResponse.json({ error: "Produktbeschreibung fehlt." }, { status: 400 });
    }
    const persona = await suggestPersona(body);
    return NextResponse.json({ persona });
  } catch (err) {
    console.error("persona-suggest failed", err);
    const message = err instanceof Error ? err.message : "Persona-Vorschlag fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
