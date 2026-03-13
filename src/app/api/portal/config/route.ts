import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { getConfig, getPipelineStages } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const [config, pipeline_stages] = await Promise.all([
      getConfig(),
      getPipelineStages(),
    ]);
    return NextResponse.json({ config, pipeline_stages });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
