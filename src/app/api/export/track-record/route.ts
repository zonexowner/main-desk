import { NextResponse } from "next/server";
import { canViewFullHistory, getUserAccess } from "@/lib/auth/access";
import { getTrackRecord, trackRecordCsv } from "@/lib/services/track-record";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getUserAccess();
  if (!canViewFullHistory(access)) {
    return NextResponse.json(
      { error: "CSV export is a Pro feature." },
      { status: 403 },
    );
  }

  const { closed } = await getTrackRecord();
  const csv = trackRecordCsv(closed);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="main-desk-track-record-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
