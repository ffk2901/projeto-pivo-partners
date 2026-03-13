import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { getUserById, getUserProjectAccess } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await getUserById(payload.user_id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json({
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        name: user.name,
        projects: "all",
      });
    }

    const access = await getUserProjectAccess(user.user_id);
    return NextResponse.json({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
      projects: access.map((a) => ({ project_id: a.project_id, permission_level: a.permission_level })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
