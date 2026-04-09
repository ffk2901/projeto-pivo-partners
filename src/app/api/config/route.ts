import { NextRequest, NextResponse } from "next/server";
import { getConfig, getPipelineStages, setPipelineStages } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [config, stages] = await Promise.all([
      getConfig(),
      getPipelineStages(),
    ]);
    return NextResponse.json({ config, pipeline_stages: stages });
  } catch (err) {
    console.error("[GET /api/config] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { pipeline_stages } = body;

    if (!Array.isArray(pipeline_stages) || pipeline_stages.length === 0) {
      return NextResponse.json(
        { error: "pipeline_stages must be a non-empty array" },
        { status: 400 }
      );
    }

    const cleaned = pipeline_stages.map((s: unknown) => String(s).trim()).filter(Boolean);
    if (cleaned.length === 0) {
      return NextResponse.json(
        { error: "At least one stage name is required" },
        { status: 400 }
      );
    }

    const unique = Array.from(new Set(cleaned));
    if (unique.length !== cleaned.length) {
      return NextResponse.json(
        { error: "Duplicate stage names are not allowed" },
        { status: 400 }
      );
    }

    await setPipelineStages(unique);

    // Read back from DB to confirm
    const confirmed = await getPipelineStages();
    return NextResponse.json({ pipeline_stages: confirmed });
  } catch (err) {
    console.error("[PUT /api/config] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
