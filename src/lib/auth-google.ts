import { google } from "googleapis";
import { getAuthTokenByTeamId, upsertAuthToken } from "./sheets";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth2 credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function generateAuthUrl(teamId: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    state: teamId,
  });
}

export async function exchangeCodeForTokens(code: string, teamId: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get tokens from Google");
  }

  // Get user email from the token
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: userInfo } = await oauth2.userinfo.get();

  await upsertAuthToken({
    team_id: teamId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : "",
    google_email: userInfo.email || "",
  });

  return { email: userInfo.email };
}

export async function getValidToken(teamId: string): Promise<string | null> {
  const stored = await getAuthTokenByTeamId(teamId);
  if (!stored || !stored.access_token) return null;

  // Check if token is expired (with 5min buffer)
  if (stored.expires_at) {
    const expiresAt = new Date(stored.expires_at).getTime();
    const now = Date.now();
    if (now < expiresAt - 5 * 60 * 1000) {
      return stored.access_token;
    }
  }

  // Token expired, try to refresh
  if (!stored.refresh_token) return null;

  try {
    const client = getOAuth2Client();
    client.setCredentials({ refresh_token: stored.refresh_token });
    const { credentials } = await client.refreshAccessToken();

    if (!credentials.access_token) return null;

    await upsertAuthToken({
      team_id: teamId,
      access_token: credentials.access_token,
      refresh_token: stored.refresh_token, // keep original refresh token
      expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : "",
      google_email: stored.google_email,
    });

    return credentials.access_token;
  } catch (err) {
    console.error("Failed to refresh token:", err);
    return null;
  }
}

export async function getCalendarConnectionStatus(teamId: string): Promise<{
  connected: boolean;
  email?: string;
  expired?: boolean;
}> {
  const stored = await getAuthTokenByTeamId(teamId);
  if (!stored || !stored.access_token) {
    return { connected: false };
  }

  // Check expiry
  if (stored.expires_at) {
    const expiresAt = new Date(stored.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Try refresh
      const token = await getValidToken(teamId);
      if (!token) {
        return { connected: false, email: stored.google_email, expired: true };
      }
    }
  }

  return { connected: true, email: stored.google_email };
}
