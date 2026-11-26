/** Pages accessibles sans être connecté (utilisé par le proxy et par AuthContext). */
export const PUBLIC_PAGES = ["/login", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"];

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
