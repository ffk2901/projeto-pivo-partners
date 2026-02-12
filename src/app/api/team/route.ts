import { NextResponse } from "next/server";
import { getTeam } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const team = await getTeam();
    return NextResponse.json(team);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
