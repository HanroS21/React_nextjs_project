import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "./lib/session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && readSession(token)) return NextResponse.next();

  // No valid session: send the visitor to the sign-in page instead of the app page.
  const url = request.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/weather/:path*", "/activity/:path*", "/account/:path*", "/users/:path*"],
};