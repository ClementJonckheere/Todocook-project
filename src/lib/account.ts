import crypto from "crypto";
import type { PoolClient } from "pg";
import { hashToken } from "./auth";

export const RESET_TOKEN_TTL_MINUTES = 60;

export interface DeletionSummary {
  deleted_recipes: number;
  anonymized_recipes: number;
}

/**
 * Supprime un compte et toutes ses données (dans la transaction de l'appelant).
 *
 * Les tables liées à l'utilisateur (sessions, garde-manger, planning, journal, listes,
 * notes, favoris, préférences…) sont supprimées en cascade. Les recettes n'ont pas de clé
 * étrangère vers l'utilisateur : elles sont traitées ici.
 * - recette privée, ou publique sans usage par d'autres : supprimée ;
 * - recette publique utilisée par d'autres utilisateurs (planning, favori, note) : conservée
 *   mais anonymisée (created_by = NULL), pour ne pas effacer l'historique des autres.
 */
export async function deleteAccount(client: PoolClient, userId: number): Promise<DeletionSummary> {
  const { rowCount: anonymized } = await client.query(
    `UPDATE recipes r SET created_by = NULL, updated_at = NOW()
     WHERE r.created_by = $1 AND r.is_public AND (
       EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.recipe_id = r.id AND mp.user_id <> $1)
       OR EXISTS (SELECT 1 FROM recipe_favorites f WHERE f.recipe_id = r.id AND f.user_id <> $1)
       OR EXISTS (SELECT 1 FROM recipe_ratings rr WHERE rr.recipe_id = r.id AND rr.user_id <> $1)
     )`,
    [userId]
  );
  const { rowCount: deleted } = await client.query("DELETE FROM recipes WHERE created_by = $1", [userId]);
  await client.query("DELETE FROM users WHERE id = $1", [userId]);
  return { deleted_recipes: deleted ?? 0, anonymized_recipes: anonymized ?? 0 };
}

/** Crée un lien de réinitialisation (les précédents sont invalidés) et renvoie le jeton en clair. */
export async function createPasswordResetToken(client: PoolClient, userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
  await client.query(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + make_interval(mins => $3))`,
    [hashToken(token), userId, RESET_TOKEN_TTL_MINUTES]
  );
  return token;
}

export function passwordResetMail(link: string) {
  const text = `Bonjour,

Une réinitialisation du mot de passe de votre compte TodoCook a été demandée.
Pour choisir un nouveau mot de passe, ouvrez ce lien (valable ${RESET_TOKEN_TTL_MINUTES} minutes, utilisable une seule fois) :

${link}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.`;
  const html = `<p>Bonjour,</p>
<p>Une réinitialisation du mot de passe de votre compte TodoCook a été demandée.</p>
<p><a href="${link}">Choisir un nouveau mot de passe</a><br>
<small>Lien valable ${RESET_TOKEN_TTL_MINUTES} minutes, utilisable une seule fois.</small></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>`;
  return { subject: "Réinitialisation de votre mot de passe TodoCook", text, html };
}
