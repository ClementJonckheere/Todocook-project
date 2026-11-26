import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, revokeUserSessions, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { parseJsonBody, validationError } from "@/lib/api-validation";
import { changePasswordSchema } from "@/lib/schemas";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Change le mot de passe ; les sessions des autres appareils sont révoquées. */
export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const limit = checkRateLimit(`account:password:${user.id}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = await parseJsonBody(request, changePasswordSchema);
  if (parsed.response) return parsed.response;
  const { current_password, new_password } = parsed.data;

  const { rows } = await query<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!verifyPassword(current_password, rows[0]?.password_hash)) {
    return validationError([{ field: "current_password", message: "Mot de passe actuel incorrect" }]);
  }
  await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hashPassword(new_password), user.id]);
  await revokeUserSessions(user.id, { keepCurrent: true });
  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);
  return NextResponse.json({ success: true, message: "Mot de passe modifié. Les autres appareils ont été déconnectés." });
}
