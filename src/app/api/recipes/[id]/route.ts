import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { parseRecipeId, RECIPE_NOT_FOUND } from "@/lib/recipe-access";
import { parseJsonBody } from "@/lib/api-validation";
import { recipeCreateSchema } from "@/lib/schemas";
import { nutritionFromInput } from "@/lib/recipe-input";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const recipeId = parseRecipeId((await params).id);
    if (!recipeId) return NextResponse.json(RECIPE_NOT_FOUND, { status: 404 });

    // Recette publique ou créée par l'utilisateur ; les recettes privées des autres restent introuvables
    const { rows: recipeRows } = await query(
      "SELECT * FROM recipes WHERE id = $1 AND (is_public OR created_by = $2)",
      [recipeId, userId]
    );
    if (recipeRows.length === 0) {
      return NextResponse.json(RECIPE_NOT_FOUND, { status: 404 });
    }

    const { rows: ingredients } = await query(
      `SELECT ri.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.unit as ingredient_unit, i.category, i.barcode
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = $1
       ORDER BY ri.id`,
      [recipeId]
    );

    // Get rating info
    const { rows: ratingRows } = await query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as rating_count FROM recipe_ratings WHERE recipe_id = $1`,
      [recipeId]
    );

    // Check if user has favorited
    const { rows: favRows } = await query(
      `SELECT id FROM recipe_favorites WHERE recipe_id = $1 AND user_id = $2`,
      [recipeId, userId]
    );

    // Get user's rating
    const { rows: userRating } = await query(
      `SELECT rating, comment FROM recipe_ratings WHERE recipe_id = $1 AND user_id = $2`,
      [recipeId, userId]
    );

    return NextResponse.json({
      ...recipeRows[0],
      ingredients,
      avg_rating: parseFloat(ratingRows[0].avg_rating) || 0,
      rating_count: parseInt(ratingRows[0].rating_count) || 0,
      is_favorite: favRows.length > 0,
      user_rating: userRating[0] || null,
      // Seul le créateur peut modifier ou supprimer la recette
      is_owner: recipeRows[0].created_by === userId,
    });
  } catch (error) {
    console.error("GET /api/recipes/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Modifie une recette (créateur uniquement). Le corps reprend celui de la création ;
 * les ingrédients sont remplacés et les valeurs nutritionnelles recalculées. Les repas déjà
 * consommés gardent leurs valeurs figées ; les repas seulement prévus suivent la recette.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let client: PoolClient | undefined;
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const recipeId = parseRecipeId((await params).id);
    if (!recipeId) return NextResponse.json(RECIPE_NOT_FOUND, { status: 404 });

    // Recette d'un autre utilisateur ou du catalogue : 404, comme une recette inexistante
    const { rows: owned } = await query<{ is_public: boolean }>(
      "SELECT is_public FROM recipes WHERE id = $1 AND created_by = $2",
      [recipeId, authUser.id]
    );
    if (!owned[0]) return NextResponse.json(RECIPE_NOT_FOUND, { status: 404 });

    const parsed = await parseJsonBody(request, recipeCreateSchema);
    if (parsed.response) return parsed.response;
    const { name, description, instructions, prep_time, cook_time, servings, image_url, is_public, ingredients } = parsed.data;
    const nextPublic = is_public ?? owned[0].is_public;

    // Rendre privée une recette publique déjà utilisée par d'autres la leur retirerait
    if (owned[0].is_public && !nextPublic) {
      const { rowCount: usedByOthers } = await query(
        `SELECT 1 WHERE EXISTS (SELECT 1 FROM meal_plans WHERE recipe_id = $1 AND user_id <> $2)
            OR EXISTS (SELECT 1 FROM recipe_favorites WHERE recipe_id = $1 AND user_id <> $2)
            OR EXISTS (SELECT 1 FROM recipe_ratings WHERE recipe_id = $1 AND user_id <> $2)`,
        [recipeId, authUser.id]
      );
      if (usedByOthers) {
        return NextResponse.json(
          { error: "Cette recette est utilisée par d'autres personnes : elle ne peut plus redevenir privée." },
          { status: 409 }
        );
      }
    }

    const computed = await nutritionFromInput(ingredients);
    if (computed.response) return computed.response;
    const { nutrition } = computed;

    client = await (await getPool()).connect();
    await client.query("BEGIN");
    await client.query(
      `UPDATE recipes SET name = $1, description = $2, instructions = $3, prep_time = $4, cook_time = $5,
         servings = $6, calories = $7, protein = $8, carbs = $9, fat = $10, image_url = $11, is_public = $12,
         updated_at = NOW()
       WHERE id = $13 AND created_by = $14`,
      [
        name, description ?? null, instructions ?? null, prep_time ?? null, cook_time ?? null, servings ?? 1,
        nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.fat,
        image_url ?? null, nextPublic, recipeId, authUser.id,
      ]
    );
    await client.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [recipeId]);
    for (const ing of ingredients) {
      await client.query(
        "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)",
        [recipeId, ing.ingredient_id, ing.quantity, ing.unit || "g"]
      );
    }
    const { rows } = await client.query("SELECT * FROM recipes WHERE id = $1", [recipeId]);
    await client.query("COMMIT");
    return NextResponse.json(rows[0]);
  } catch (error) {
    await client?.query("ROLLBACK").catch(() => undefined);
    console.error("PUT /api/recipes/[id] error:", error);
    return NextResponse.json({ error: "Erreur lors de la modification de la recette" }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const recipeId = parseRecipeId((await params).id);
    if (!recipeId) return NextResponse.json(RECIPE_NOT_FOUND, { status: 404 });

    const planned = await query(
      "SELECT 1 FROM meal_plans mp JOIN recipes r ON r.id = mp.recipe_id WHERE r.id = $1 AND r.created_by = $2 LIMIT 1",
      [recipeId, authUser.id]
    );
    if (planned.rowCount) return NextResponse.json({ error: "Cette recette figure dans le planning ou le journal." }, { status: 409 });

    const result = await query("DELETE FROM recipes WHERE id = $1 AND created_by = $2", [recipeId, authUser.id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Recette non trouvée ou non autorisé" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recipes/[id] error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
