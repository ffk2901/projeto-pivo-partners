import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await healthCheck();
  return NextResponse.json(result);
}
