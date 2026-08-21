import { NextRequest, NextResponse } from "next/server";
import { runAnalysis } from "@/lib/scoring/engine";
import type { AdInput } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { input: AdInput };
    const input = body.input;
    if (!input || !input.platforms?.length) {
      return NextResponse.json({ error: "Ungültige Eingabe: Plattform fehlt." }, { status: 400 });
    }
    if (!input.copy || (!input.copy.primaryText && !input.copy.headline)) {
      return NextResponse.json({ error: "Ungültige Eingabe: Copy fehlt." }, { status: 400 });
    }
    const result = await runAnalysis(input);
    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze failed", err);
    const message = err instanceof Error ? err.message : "Analyse fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
