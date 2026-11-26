import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { parseJsonBody, validationError } from "@/lib/api-validation";
import { resetPasswordSchema } from "@/lib/schemas";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Nouveau mot de passe à partir du lien reçu par e-mail ; toutes les sessions sont révoquées. */
export async function POST(request: Request) {
  const limit = checkRateLimit(`reset:ip:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = await parseJsonBody(request, resetPasswordSchema);
  if (parsed.response) return parsed.response;
  const { token, password } = parsed.data;

  let client: PoolClient | undefined;
  try {
    client = await (await getPool()).connect();
    await client.query("BEGIN");
    // Le lien est consommé atomiquement : deux requêtes simultanées ne peuvent pas l'utiliser deux fois
    const { rows } = await client.query<{ user_id: number }>(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [hashToken(token)]
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return validationError([{ field: "token", message: "Lien invalide ou expiré. Faites une nouvelle demande." }]);
    }
    const userId = rows[0].user_id;
    await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hashPassword(password), userId]);
    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL", [userId]);
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Mot de passe modifié. Vous pouvez vous connecter." });
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => undefined);
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ error: "Erreur lors de la réinitialisation" }, { status: 500 });
  } finally {
    client?.release();
  }
}
