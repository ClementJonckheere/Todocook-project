import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";
import { parseJsonBody } from "@/lib/api-validation";
import { forgotPasswordSchema } from "@/lib/schemas";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { createPasswordResetToken, passwordResetMail } from "@/lib/account";
import { appUrl, sendMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// Même réponse que le compte existe ou non : la route ne doit pas révéler les e-mails inscrits.
const GENERIC = {
  success: true,
  message: "Si un compte correspond à cette adresse, un e-mail contenant un lien de réinitialisation vient d'être envoyé.",
};

export async function POST(request: Request) {
  const ipLimit = checkRateLimit(`forgot:ip:${clientIp(request)}`, 5, 15 * 60 * 1000);
  if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds);

  const parsed = await parseJsonBody(request, forgotPasswordSchema);
  if (parsed.response) return parsed.response;
  const { email } = parsed.data;

  const emailLimit = checkRateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) return NextResponse.json(GENERIC);

  let client: PoolClient | undefined;
  try {
    client = await (await getPool()).connect();
    const { rows } = await client.query<{ id: number }>("SELECT id FROM users WHERE lower(email) = $1", [email]);
    if (rows[0]) {
      const token = await createPasswordResetToken(client, rows[0].id);
      const link = `${appUrl(request)}/reinitialiser-mot-de-passe?token=${token}`;
      await sendMail({ to: email, ...passwordResetMail(link) });
    }
  } catch (error) {
    // Échec d'envoi : journalisé, mais la réponse reste identique (pas d'énumération des comptes)
    console.error("POST /api/auth/forgot-password error:", error);
  } finally {
    client?.release();
  }
  return NextResponse.json(GENERIC);
}
