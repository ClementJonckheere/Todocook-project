import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { parseJsonBody, validationError } from "@/lib/api-validation";
import { changeEmailSchema } from "@/lib/schemas";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Change l'adresse e-mail (identifiant de connexion), après confirmation du mot de passe. */
export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const limit = checkRateLimit(`account:email:${user.id}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = await parseJsonBody(request, changeEmailSchema);
  if (parsed.response) return parsed.response;
  const { email, password } = parsed.data;

  const { rows } = await query<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!verifyPassword(password, rows[0]?.password_hash)) {
    return validationError([{ field: "password", message: "Mot de passe incorrect" }]);
  }
  const { rowCount: taken } = await query("SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2", [email, user.id]);
  if (taken) return validationError([{ field: "email", message: "Cet email est déjà utilisé" }], 409);

  await query("UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2", [email, user.id]);
  return NextResponse.json({ success: true, email });
}
