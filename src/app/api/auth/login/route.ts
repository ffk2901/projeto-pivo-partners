import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, updateUser } from "@/lib/db";
import { signJWT, verifyPassword, createAuthCookieOptions, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signJWT({ user_id: user.user_id, email: user.email, role: user.role });

    await updateUser({ user_id: user.user_id, last_login: new Date().toISOString() });

    const response = NextResponse.json({
      user: { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, createAuthCookieOptions());
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login failed" },
      { status: 500 }
    );
  }
}
