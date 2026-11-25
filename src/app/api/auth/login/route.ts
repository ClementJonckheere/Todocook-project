import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie, sessionClientFrom } from "@/lib/auth";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/api-validation";
import { loginSchema } from "@/lib/schemas";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, loginSchema);
    if (parsed.response) return parsed.response;
    const { email, password } = parsed.data;

    // Limite par adresse IP et par compte visé, pour freiner le test de mots de passe
    for (const key of [`login:ip:${clientIp(request)}`, `login:email:${email}`]) {
      const limit = checkRateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
      if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const { rows } = await query(
      "SELECT id, email, first_name, last_name, password_hash FROM users WHERE lower(email) = $1",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const user = rows[0];

    // Reject login for legacy seed users that have no password set
    if (!user.password_hash) {
      return NextResponse.json({ error: "Veuillez réinitialiser votre mot de passe" }, { status: 401 });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const client = sessionClientFrom(request);
    const token = await createSession(user.id, client);
    if (client === "web") await setSessionCookie(token);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      // Le token n'est renvoyé qu'à l'application mobile ; le web utilise le cookie httpOnly.
      ...(client === "mobile" ? { token } : {}),
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erreur lors de la connexion" }, { status: 500 });
  }
}
