import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "./access";

export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  // Try headers set by middleware first
  const role = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");

  if (role === "admin" && userId) {
    return { userId };
  }

  // Fallback: read cookie directly
  const payload = await requireAuth(request);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: payload.user_id };
}
