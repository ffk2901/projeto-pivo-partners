import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/unlock", "/api/unlock"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const auth = request.cookies.get("pivo-auth");
  if (auth?.value === "1") return NextResponse.next();

  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
