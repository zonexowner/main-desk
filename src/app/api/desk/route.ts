import { NextResponse } from "next/server";
import { getDeskPayload } from "@/lib/services/desk-data";

export async function GET() {
  return NextResponse.json(await getDeskPayload());
}
