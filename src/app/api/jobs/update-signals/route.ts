import { NextResponse } from "next/server";
import { assertWriteAccess } from "@/lib/auth/write-access";
import { updateRunningSignals } from "@/lib/services/signal-engine";

export async function POST(request: Request) {
  const unauthorized = assertWriteAccess(request);
  if (unauthorized) return unauthorized;

  const updated = await updateRunningSignals();
  return NextResponse.json({ ok: true, updated });
}

export async function GET(request: Request) {
  return POST(request);
}
