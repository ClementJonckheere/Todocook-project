import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicPage } from "@/lib/public-pages";

const SESSION_COOKIE = "todocook-session";

// Seules ces routes API sont accessibles sans session. Toutes les autres exigent
// un cookie de session (web) ou un en-tête "Authorization: Bearer" (mobile),
// et chaque route vérifie en plus la validité de la session en base.
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/nutrition/calculate",
];


function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    Boolean(request.cookies.get(SESSION_COOKIE)?.value) ||
    /^Bearer\s+\S+$/.test(request.headers.get("authorization") ?? "");

  if (pathname.startsWith("/api/")) {
    if (!hasSession && !matches(pathname, PUBLIC_API_PATHS)) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Fichiers statiques (icônes, manifeste, service worker, page hors ligne…)
  if (pathname.includes(".")) return NextResponse.next();

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/dashboard" : "/login", request.url));
  }
  // Pas de redirection de /login vers /dashboard ici : la seule présence du cookie ne dit pas
  // si la session est encore valide (elle peut avoir expiré ou été révoquée). La page de
  // connexion vérifie elle-même la session et redirige si elle l'est.
  if (!hasSession && !isPublicPage(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.png|apple-touch-icon\\.png|manifest\\.json|sw\\.js|icons/).*)"],
};
