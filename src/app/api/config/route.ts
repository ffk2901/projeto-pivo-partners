import { NextResponse } from "next/server";
import { getConfig, getPipelineStages } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [config, stages] = await Promise.all([
      getConfig(),
      getPipelineStages(),
    ]);
    return NextResponse.json({ config, pipeline_stages: stages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
