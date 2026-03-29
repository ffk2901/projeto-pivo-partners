import { google } from "googleapis";
import {
  getCalendarToken,
  upsertCalendarToken,
  deleteCalendarToken,
} from "./db";
import type { CalendarToken } from "./db";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function generateAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "openid",
      "email",
    ],
    state: userId,
  });
}

export async function exchangeCodeForTokens(
  code: string,
  userId: string
): Promise<{ email: string }> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing access_token or refresh_token from Google");
  }

  // Get user's Google email
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();
  const email = userInfo.email || "";

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  await upsertCalendarToken({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    google_email: email,
  });

  return { email };
}

export async function getValidToken(
  userId: string
): Promise<CalendarToken | null> {
  const token = await getCalendarToken(userId);
  if (!token) return null;

  // Check if token is still valid (with 5-minute buffer)
  const expiresAt = new Date(token.expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return token;
  }

  // Token expired — attempt refresh
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: token.refresh_token });
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("No access_token returned from refresh");
    }

    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    const updated: CalendarToken = {
      ...token,
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || token.refresh_token,
      expires_at: newExpiresAt,
    };
    await upsertCalendarToken(updated);
    return updated;
  } catch {
    // Refresh failed (likely revoked) — delete stale token
    await deleteCalendarToken(userId);
    return null;
  }
}

export async function getCalendarConnectionStatus(
  userId: string
): Promise<{
  connected: boolean;
  email?: string;
  reason?: "not_connected" | "token_revoked";
}> {
  const token = await getCalendarToken(userId);
  if (!token) {
    return { connected: false, reason: "not_connected" };
  }

  // Try to ensure token is valid
  const valid = await getValidToken(userId);
  if (!valid) {
    return { connected: false, reason: "token_revoked" };
  }

  return { connected: true, email: valid.google_email };
}
