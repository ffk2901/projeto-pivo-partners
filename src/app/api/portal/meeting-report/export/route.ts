import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkProjectAccess } from "@/lib/access";
import { generatePipelineReport } from "@/lib/export-report";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const projectId = new URL(req.url).searchParams.get("project_id");
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

    const access = await checkProjectAccess(payload.user_id, payload.role, projectId);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { buffer, filename } = await generatePipelineReport(projectId);

    return new Response(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
