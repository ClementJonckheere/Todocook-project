import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const body = await request.json();
    const { recipes } = body;

    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({ error: "Format d'import invalide" }, { status: 400 });
    }

    let imported = 0;

    for (const recipe of recipes) {
      if (!recipe.name) continue;

      const { rows: recipeRows } = await query(
        `INSERT INTO recipes (name, description, instructions, prep_time, cook_time, servings, calories, protein, carbs, fat, is_public, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11) RETURNING id`,
        [
          recipe.name,
          recipe.description || null,
          recipe.instructions || null,
          recipe.prep_time || null,
          recipe.cook_time || null,
          recipe.servings || 1,
          recipe.calories || 0,
          recipe.protein || 0,
          recipe.carbs || 0,
          recipe.fat || 0,
          userId,
        ]
      );
      const recipeId = recipeRows[0].id;

      // Link ingredients if they exist in DB
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        for (const ing of recipe.ingredients) {
          if (!ing.name) continue;
          const { rows: ingRows } = await query(
            "SELECT id FROM ingredients WHERE name ILIKE $1 LIMIT 1",
            [ing.name]
          );
          if (ingRows.length > 0) {
            await query(
              `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
               VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
              [recipeId, ingRows[0].id, ing.quantity || 100, ing.unit || "g"]
            );
          }
        }
      }

      await query(
        `INSERT INTO user_recipes (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, recipeId]
      );

      imported++;
    }

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    console.error("POST /api/import error:", error);
    return NextResponse.json({ error: "Erreur lors de l'import" }, { status: 500 });
  }
}
