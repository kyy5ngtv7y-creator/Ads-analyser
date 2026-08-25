import { NextResponse } from "next/server";
import { registerVisit } from "@/lib/store";

export const dynamic = "force-dynamic";

// Der Client meldet sich einmal pro Browser-Sitzung (sessionStorage-Guard).
export async function POST() {
  await registerVisit();
  return NextResponse.json({ ok: true });
}
