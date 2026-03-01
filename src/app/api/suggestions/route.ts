import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const maxMissing = Math.min(Math.max(parseInt(searchParams.get("maxMissing") || "0") || 0, 0), 20);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);
    const limit = 10;

    const { rows: pantryItems } = await query(
      "SELECT ingredient_id FROM pantry_items WHERE user_id = $1",
      [userId]
    );
    const pantryIds = new Set(pantryItems.map((p: any) => p.ingredient_id));

    const { rows: recipes } = await query(
      `SELECT r.*, STRING_AGG(ri.ingredient_id::text, ',') as ingredient_ids
       FROM recipes r
       JOIN recipe_ingredients ri ON r.id = ri.recipe_id
       WHERE r.is_public = true OR r.created_by = $1
       GROUP BY r.id`,
      [userId]
    );

    const scoredRecipes = recipes.map((recipe: any) => {
      const ingredientIds = recipe.ingredient_ids
        .split(",")
        .map((id: string) => parseInt(id));
      const totalIngredients = ingredientIds.length;
      const missingCount = ingredientIds.filter(
        (id: number) => !pantryIds.has(id)
      ).length;
      const missingIngredients = ingredientIds.filter(
        (id: number) => !pantryIds.has(id)
      );

      return {
        ...recipe,
        total_ingredients: totalIngredients,
        missing_count: missingCount,
        missing_ingredient_ids: missingIngredients,
      };
    });

    const filtered = scoredRecipes
      .filter((r: any) => r.missing_count <= maxMissing)
      .sort((a: any, b: any) => a.missing_count - b.missing_count);

    const total = filtered.length;
    const paginatedRecipes = filtered.slice(offset, offset + limit);

    // Batch-fetch all missing ingredient names in a single query
    const allMissingIds = Array.from(new Set(paginatedRecipes.flatMap((r: { missing_ingredient_ids: number[] }) => r.missing_ingredient_ids)));
    const ingredientNameMap = new Map<number, string>();
    if (allMissingIds.length > 0) {
      const { rows: ingredientRows } = await query(
        "SELECT id, name FROM ingredients WHERE id = ANY($1)",
        [allMissingIds]
      );
      for (const row of ingredientRows) {
        ingredientNameMap.set(row.id, row.name);
      }
    }

    const enriched = paginatedRecipes.map((recipe: { missing_ingredient_ids: number[] }) => ({
      ...recipe,
      missing_ingredient_names: recipe.missing_ingredient_ids.map(
        (id: number) => ingredientNameMap.get(id) || "Inconnu"
      ),
    }));

    return NextResponse.json({
      recipes: enriched,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("GET /api/suggestions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
