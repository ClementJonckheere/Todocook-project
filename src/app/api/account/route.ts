import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/db";
import { clearSessionCookie, getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { parseJsonBody, validationError } from "@/lib/api-validation";
import { deleteAccountSchema } from "@/lib/schemas";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { deleteAccount } from "@/lib/account";

export const dynamic = "force-dynamic";

/**
 * Supprime définitivement le compte et ses données (droit à l'effacement, RGPD).
 * Exige le mot de passe et la confirmation « SUPPRIMER ».
 */
export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const limit = checkRateLimit(`account:delete:${user.id}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = await parseJsonBody(request, deleteAccountSchema);
  if (parsed.response) return parsed.response;

  const { rows } = await query<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!verifyPassword(parsed.data.password, rows[0]?.password_hash)) {
    return validationError([{ field: "password", message: "Mot de passe incorrect" }]);
  }

  let client: PoolClient | undefined;
  try {
    client = await (await getPool()).connect();
    await client.query("BEGIN");
    const summary = await deleteAccount(client, user.id);
    await client.query("COMMIT");
    await clearSessionCookie();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => undefined);
    console.error("DELETE /api/account error:", error);
    return NextResponse.json({ error: "La suppression a échoué : aucune donnée n'a été supprimée." }, { status: 500 });
  } finally {
    client?.release();
  }
}
