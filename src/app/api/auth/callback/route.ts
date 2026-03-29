import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/auth-google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // user_id

    if (!code || !state) {
      const errorUrl = new URL("/", req.url);
      errorUrl.searchParams.set("calendar_error", "missing_params");
      return NextResponse.redirect(errorUrl);
    }

    await exchangeCodeForTokens(code, state);

    const successUrl = new URL("/", req.url);
    successUrl.searchParams.set("calendar_connected", "true");
    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const errorUrl = new URL("/", req.url);
    errorUrl.searchParams.set("calendar_error", "auth_failed");
    return NextResponse.redirect(errorUrl);
  }
}
