import { query } from "./db";

/**
 * Règle d'accès aux recettes : une recette est visible si elle est publique
 * ou si l'utilisateur l'a créée. Les recettes privées des autres sont introuvables (404),
 * pour ne pas révéler leur existence.
 */

/** Identifiant de recette valide (entier positif tenant dans un INTEGER Postgres), sinon null. */
export function parseRecipeId(value: unknown): number | null {
  const id = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export async function canAccessRecipe(recipeId: number, userId: number): Promise<boolean> {
  const { rowCount } = await query(
    "SELECT 1 FROM recipes WHERE id = $1 AND (is_public OR created_by = $2)",
    [recipeId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export const RECIPE_NOT_FOUND = { error: "Recette non trouvée" } as const;
