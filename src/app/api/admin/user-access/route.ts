import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getUserProjectAccess, createUserProjectAccess, deleteUserProjectAccess, generateId } from "@/lib/db";
import type { UserProjectAccess } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const userId = request.nextUrl.searchParams.get("user_id");
  const rows = await getUserProjectAccess(userId || undefined);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { user_id, project_id, permission_level } = body;

  if (!user_id || !project_id || !permission_level) {
    return NextResponse.json({ error: "user_id, project_id, and permission_level are required" }, { status: 400 });
  }

  if (!["view", "edit"].includes(permission_level)) {
    return NextResponse.json({ error: "permission_level must be view or edit" }, { status: 400 });
  }

  const access: UserProjectAccess = {
    access_id: generateId("acc"),
    user_id,
    project_id,
    permission_level,
    granted_by: auth.userId,
    granted_at: new Date().toISOString(),
  };

  await createUserProjectAccess(access);
  return NextResponse.json(access, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const accessId = request.nextUrl.searchParams.get("access_id");
  if (!accessId) {
    return NextResponse.json({ error: "access_id is required" }, { status: 400 });
  }

  await deleteUserProjectAccess(accessId);
  return NextResponse.json({ success: true });
}
