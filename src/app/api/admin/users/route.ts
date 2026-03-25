import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getUsers, createUser, updateUser, generateId } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { User } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const users = await getUsers();
    // Strip password_hash from response
    const safe = users.map(({ password_hash: _, ...rest }) => rest);
    return NextResponse.json(safe);
  } catch (err) {
    console.error("Get users error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { email, name, role, password } = body;

    if (!email || !name || !role || !password) {
      return NextResponse.json({ error: "email, name, role, and password are required" }, { status: 400 });
    }

    if (!["admin", "client"].includes(role)) {
      return NextResponse.json({ error: "role must be admin or client" }, { status: 400 });
    }

    const { getUserByEmail } = await import("@/lib/db");
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();
    const user: User = {
      user_id: generateId("usr"),
      email,
      password_hash,
      name,
      role,
      status: "active",
      created_at: now,
      last_login: null,
    };

    await createUser(user);
    const { password_hash: _, ...safe } = user;
    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { user_id, ...updates } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Don't allow updating password_hash through this endpoint
    delete updates.password_hash;

    await updateUser({ user_id, ...updates });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update user error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update user" }, { status: 500 });
  }
}
