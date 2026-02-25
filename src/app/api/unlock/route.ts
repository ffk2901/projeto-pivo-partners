import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("pivo-auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // 7 days
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
