import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/bookings"];
const adminPaths = ["/admin"];
const authPaths = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Redirect logged-in users away from auth pages
  if (token && authPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect user routes
  if (!token && protectedPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin routes — role check happens on the page (no role in cookie)
  if (!token && adminPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/bookings/:path*", "/admin/:path*", "/login", "/signup"],
};
