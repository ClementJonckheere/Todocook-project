import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";
  const maxMissing = parseInt(searchParams.get("maxMissing") || "0");
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = 10;

  // Get user's pantry ingredient IDs
  const pantryItems = db.prepare(
    "SELECT ingredient_id FROM pantry_items WHERE user_id = ?"
  ).all(userId) as { ingredient_id: number }[];

  const pantryIds = new Set(pantryItems.map((p) => p.ingredient_id));

  // Get all recipes with their ingredients
  const recipes = db.prepare(`
    SELECT r.*, GROUP_CONCAT(ri.ingredient_id) as ingredient_ids
    FROM recipes r
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE r.is_public = 1 OR r.created_by = ?
    GROUP BY r.id
  `).all(userId) as any[];

  // Calculate missing ingredients for each recipe
  const scoredRecipes = recipes.map((recipe) => {
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
    .filter((r) => r.missing_count <= maxMissing)
    .sort((a, b) => a.missing_count - b.missing_count);

  const total = filtered.length;
  const paginatedRecipes = filtered.slice(offset, offset + limit);

  // Enrich with missing ingredient names
  const enriched = paginatedRecipes.map((recipe) => {
    const missingNames = recipe.missing_ingredient_ids.map((id: number) => {
      const ing = db.prepare("SELECT name FROM ingredients WHERE id = ?").get(id) as any;
      return ing?.name || "Inconnu";
    });
    return {
      ...recipe,
      missing_ingredient_names: missingNames,
    };
  });

  return NextResponse.json({
    recipes: enriched,
    total,
    hasMore: offset + limit < total,
  });
}
