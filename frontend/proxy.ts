import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/bookings"];
const adminPaths = ["/admin"];
const authPaths = ["/login", "/signup"];

/** Returns true only if the token exists and hasn't expired yet. */
function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  console.log("token : ", token);
  const loggedIn = isValidToken(token);
  console.log("loggedIn : ", loggedIn);

  // Redirect logged-in users away from auth pages
  if (loggedIn && authPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect user routes
  if (!loggedIn && protectedPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin routes — role check happens on the page (no role in cookie)
  if (!loggedIn && adminPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/bookings/:path*", "/admin/:path*", "/login", "/signup"],
};
