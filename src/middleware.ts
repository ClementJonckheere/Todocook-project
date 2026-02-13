import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicPaths = [
    "/login",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/scanner",      // Allow barcode scanning without auth
    "/api/ingredients",  // Allow ingredient search without auth
    "/api/pantry",       // Allow pantry management without auth (for mobile)
    "/api/users",        // Allow user profile without auth (for mobile)
    "/api/recipes",      // Allow recipes without auth (for mobile)
    "/api/meal-plans",   // Allow meal plans without auth (for mobile)
    "/api/daily-logs",   // Allow daily logs without auth (for mobile)
    "/api/suggestions",  // Allow suggestions without auth (for mobile)
    "/api/favorites",    // Allow favorites without auth (for mobile)
    "/api/ratings",      // Allow ratings without auth (for mobile)
  ];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // Static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/icons") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const session = request.cookies.get("todocook-session")?.value;

  // Redirect to login if not authenticated
  if (!isPublicPath && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to dashboard if already authenticated and on login page
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect root to dashboard
  if (pathname === "/" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname === "/" && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.png|apple-touch-icon\\.png|manifest\\.json|sw\\.js|icons/).*)"],
};
