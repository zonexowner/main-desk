import { NextResponse } from "next/server";
import { assertWriteAccess } from "@/lib/auth/write-access";
import { generatePaperSignals } from "@/lib/services/signal-engine";

export async function POST(request: Request) {
  const unauthorized = assertWriteAccess(request);
  if (unauthorized) return unauthorized;

  const result = await generatePaperSignals();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
