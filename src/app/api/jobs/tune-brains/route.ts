import { NextResponse } from "next/server";
import { assertWriteAccess } from "@/lib/auth/write-access";
import { tuneBrainsFromHistory } from "@/lib/brain/tuning";
import { recordJobRun } from "@/lib/services/signal-store";

export async function POST(request: Request) {
  const unauthorized = assertWriteAccess(request);
  if (unauthorized) return unauthorized;

  const result = await tuneBrainsFromHistory();
  await recordJobRun("tune-brains", {
    sampleSize: result.sampleSize,
    adjustments: result.adjustments,
    skippedReason: result.skippedReason,
  });
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
