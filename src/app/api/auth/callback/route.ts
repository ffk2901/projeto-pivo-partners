import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/auth-google";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // team_id

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?calendar_error=missing_params", req.url));
  }

  try {
    await exchangeCodeForTokens(code, state);
    return NextResponse.redirect(new URL("/?calendar_connected=true", req.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?calendar_error=auth_failed", req.url));
  }
}
