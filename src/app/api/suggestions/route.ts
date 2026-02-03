import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";
  const maxMissing = parseInt(searchParams.get("maxMissing") || "0");
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = 10;

  // Get user's pantry ingredient IDs
  const { rows: pantryItems } = await query(
    "SELECT ingredient_id FROM pantry_items WHERE user_id = $1",
    [userId]
  );
  const pantryIds = new Set(pantryItems.map((p: any) => p.ingredient_id));

  // Get all recipes with their ingredients
  const { rows: recipes } = await query(
    `SELECT r.*, STRING_AGG(ri.ingredient_id::text, ',') as ingredient_ids
     FROM recipes r
     JOIN recipe_ingredients ri ON r.id = ri.recipe_id
     WHERE r.is_public = true OR r.created_by = $1
     GROUP BY r.id`,
    [userId]
  );

  // Calculate missing ingredients for each recipe
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

  // Filter by max missing ingredients
  const filtered = scoredRecipes
    .filter((r: any) => r.missing_count <= maxMissing)
    .sort((a: any, b: any) => a.missing_count - b.missing_count);

  const total = filtered.length;
  const paginatedRecipes = filtered.slice(offset, offset + limit);

  // Enrich with missing ingredient names
  const enriched = [];
  for (const recipe of paginatedRecipes) {
    const missingNames: string[] = [];
    for (const id of recipe.missing_ingredient_ids) {
      const { rows } = await query("SELECT name FROM ingredients WHERE id = $1", [id]);
      missingNames.push(rows[0]?.name || "Inconnu");
    }
    enriched.push({
      ...recipe,
      missing_ingredient_names: missingNames,
    });
  }

  return NextResponse.json({
    recipes: enriched,
    total,
    hasMore: offset + limit < total,
  });
}
