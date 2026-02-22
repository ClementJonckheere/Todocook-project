import { cookies } from "next/headers";
import { query } from "./db";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "todocook-dev-secret-change-in-production";
const SESSION_COOKIE = "todocook-session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === verify;
}

function signToken(payload: string): string {
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(payload);
  return `${payload}.${hmac.digest("hex")}`;
}

function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = token.substring(0, lastDot);
  const signature = token.substring(lastDot + 1);
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(payload);
  if (hmac.digest("hex") !== signature) return null;
  return payload;
}

export function createSession(userId: number): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return signToken(Buffer.from(payload).toString("base64"));
}

export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAuthUser(request?: Request): Promise<{ id: number; email: string; first_name: string; last_name: string } | null> {
  // Mobile dev bypass: check for X-Mobile-Dev header with user ID
  if (request) {
    const mobileDevUserId = request.headers.get("X-Mobile-Dev-User");
    if (mobileDevUserId && process.env.NODE_ENV !== "production") {
      const { rows } = await query("SELECT id, email, first_name, last_name FROM users WHERE id = $1", [mobileDevUserId]);
      return rows[0] || null;
    }
  }

  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64").toString());
    if (data.exp < Date.now()) return null;

    const { rows } = await query("SELECT id, email, first_name, last_name FROM users WHERE id = $1", [data.userId]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<{ id: number; email: string; first_name: string; last_name: string }> {
  const user = await getAuthUser();
  if (!user) throw new Error("Non authentifié");
  return user;
}

export const UNAUTHENTICATED_RESPONSE = { error: "Non authentifié" } as const;
