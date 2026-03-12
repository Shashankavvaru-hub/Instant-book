import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTE: The auth token cookie is set by the backend (onrender.com domain).
// Next.js middleware runs on the Vercel domain — it can never read a cookie
// from a different domain. Route protection is handled client-side via
// useRequireAuth() in each protected page.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/bookings/:path*", "/admin/:path*", "/login", "/signup"],
};

