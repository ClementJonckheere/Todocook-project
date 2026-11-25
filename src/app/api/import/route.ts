import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api-validation";
import { IMPORT_MAX_BYTES, importSchema } from "@/lib/schemas";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Importe les recettes d'un fichier d'export TodoCook (les autres sections sont ignorées).
 * - validation complète et limites (2 Mo, 200 recettes, 100 ingrédients par recette) ;
 * - tout ou rien : une seule transaction ;
 * - une recette dont l'utilisateur possède déjà une recette du même nom est ignorée
 *   (réimporter le même fichier ne crée pas de doublons) ;
 * - les ingrédients sont rapprochés du catalogue par nom exact (sans tenir compte de la casse) ;
 *   ceux qui n'existent pas sont listés dans la réponse.
 */
export async function POST(request: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const userId = authUser.id;

  const limit = checkRateLimit(`import:user:${userId}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = await parseJsonBody(request, importSchema, IMPORT_MAX_BYTES);
  if (parsed.response) return parsed.response;
  const { recipes } = parsed.data;

  let client: PoolClient | undefined;
  try {
    client = await (await getPool()).connect();
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query<{ name: string }>(
      "SELECT lower(name) AS name FROM recipes WHERE created_by = $1",
      [userId]
    );
    const existing = new Set(existingRows.map((row) => row.name));
    const unmatched = new Set<string>();
    const ingredientIds = new Map<string, number | null>();
    let imported = 0;
    let skipped = 0;

    for (const recipe of recipes) {
      const key = recipe.name.toLowerCase();
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      existing.add(key);

      const { rows: recipeRows } = await client.query<{ id: number }>(
        `INSERT INTO recipes (name, description, instructions, prep_time, cook_time, servings,
           calories, protein, carbs, fat, is_public, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11) RETURNING id`,
        [
          recipe.name,
          recipe.description ?? null,
          recipe.instructions ?? null,
          recipe.prep_time ?? null,
          recipe.cook_time ?? null,
          recipe.servings ?? 1,
          recipe.calories ?? 0,
          recipe.protein ?? 0,
          recipe.carbs ?? 0,
          recipe.fat ?? 0,
          userId,
        ]
      );
      const recipeId = recipeRows[0].id;

      for (const ingredient of recipe.ingredients) {
        const nameKey = ingredient.name.toLowerCase();
        if (!ingredientIds.has(nameKey)) {
          // Nom exact (et non ILIKE : « % » ou « _ » dans un nom ne doivent pas servir de jokers),
          // en privilégiant l'ingrédient générique plutôt qu'un produit de marque scanné
          const { rows } = await client.query<{ id: number }>(
            "SELECT id FROM ingredients WHERE lower(name) = $1 ORDER BY (barcode IS NULL) DESC, id LIMIT 1",
            [nameKey]
          );
          ingredientIds.set(nameKey, rows[0]?.id ?? null);
        }
        const ingredientId = ingredientIds.get(nameKey);
        if (!ingredientId) {
          unmatched.add(ingredient.name);
          continue;
        }
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
           VALUES ($1, $2, $3, $4) ON CONFLICT (recipe_id, ingredient_id) DO NOTHING`,
          [recipeId, ingredientId, ingredient.quantity ?? 100, ingredient.unit ?? "g"]
        );
      }

      await client.query(
        "INSERT INTO user_recipes (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, recipeId]
      );
      imported++;
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      imported,
      skipped,
      unmatched_ingredients: [...unmatched].sort((a, b) => a.localeCompare(b, "fr")),
    });
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => undefined);
    console.error("POST /api/import error:", error);
    return NextResponse.json({ error: "Erreur lors de l'import : aucune recette n'a été importée." }, { status: 500 });
  } finally {
    client?.release();
  }
}
