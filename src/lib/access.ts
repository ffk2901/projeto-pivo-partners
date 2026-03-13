import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT, AUTH_COOKIE_NAME, type JWTTokenPayload } from "./auth";
import { getUserProjectAccess } from "./db";

export async function checkProjectAccess(
  userId: string,
  userRole: string,
  projectId: string
): Promise<{ hasAccess: boolean; permissionLevel: "view" | "edit" | null }> {
  if (userRole === "admin") {
    return { hasAccess: true, permissionLevel: "edit" };
  }

  const accessRows = await getUserProjectAccess(userId);
  const match = accessRows.find((a) => a.project_id === projectId);
  if (!match) {
    return { hasAccess: false, permissionLevel: null };
  }
  return { hasAccess: true, permissionLevel: match.permission_level };
}

export async function requireAuth(request: NextRequest): Promise<JWTTokenPayload | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export async function getSessionFromCookies(): Promise<JWTTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}
