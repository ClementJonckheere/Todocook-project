import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { query } from "./db";

export { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "todocook-session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type AuthUser = { id: number; email: string; first_name: string; last_name: string };
export type SessionClient = "web" | "mobile";

/** Empreinte stockée en base : le token en clair n'est connu que du client. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Le token de session : soit le cookie (web), soit l'en-tête `Authorization: Bearer` (application mobile). */
export function readSessionToken(authorization: string | null, cookie: string | undefined): string | null {
  const match = authorization?.match(/^Bearer\s+([A-Za-z0-9_-]{20,200})$/);
  if (match) return match[1];
  return cookie || null;
}

/** Crée une session en base et renvoie le token (opaque, aléatoire, 256 bits). */
export async function createSession(userId: number, client: SessionClient = "web"): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO sessions (token_hash, user_id, client, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(secs => $4))`,
    [hashToken(token), userId, client, SESSION_TTL_SECONDS]
  );
  // Ménage opportuniste des sessions expirées
  await query("DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '1 day'");
  return token;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

async function currentToken(): Promise<string | null> {
  return (await currentTokenWithSource()).token;
}

async function currentTokenWithSource(): Promise<{ token: string | null; fromCookie: boolean }> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  const token = readSessionToken(headerStore.get("authorization"), cookie);
  return { token, fromCookie: token !== null && token === cookie };
}

/**
 * Efface un cookie de session qui ne correspond plus à aucune session valide (expirée,
 * révoquée…). Sans cela, le navigateur le renverrait indéfiniment et le proxy croirait
 * l'utilisateur connecté. Sans effet là où les cookies ne sont pas modifiables.
 */
async function clearStaleSessionCookie() {
  try {
    (await cookies()).delete(SESSION_COOKIE);
  } catch {
    // Contexte en lecture seule (rendu d'une page) : le cookie sera effacé au prochain appel d'API
  }
}

/**
 * Utilisateur de la session courante, ou null.
 * Le paramètre `request` est conservé pour compatibilité : la lecture passe par next/headers.
 */
export async function getAuthUser(_request?: Request): Promise<AuthUser | null> {
  const { token, fromCookie } = await currentTokenWithSource();
  if (!token) return null;
  const { rows } = await query<AuthUser>(
    `SELECT u.id, u.email, u.first_name, u.last_name
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  if (!rows[0] && fromCookie) await clearStaleSessionCookie();
  return rows[0] ?? null;
}

/** Révoque la session courante (déconnexion de cet appareil uniquement). */
export async function revokeCurrentSession(): Promise<void> {
  const token = await currentToken();
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

/** Le client mobile demande à recevoir le token dans la réponse (il n'utilise pas les cookies). */
export function sessionClientFrom(request: Request): SessionClient {
  return request.headers.get("x-client") === "mobile" ? "mobile" : "web";
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new Error("Non authentifié");
  return user;
}

export const UNAUTHENTICATED_RESPONSE = { error: "Non authentifié" } as const;
