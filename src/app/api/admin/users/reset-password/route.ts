import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updateUser } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { user_id, new_password } = await request.json();

  if (!user_id || !new_password) {
    return NextResponse.json({ error: "user_id and new_password are required" }, { status: 400 });
  }

  if (new_password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const password_hash = await hashPassword(new_password);
  await updateUser({ user_id, password_hash });

  return NextResponse.json({ success: true });
}
