import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { parseRecipeId, RECIPE_NOT_FOUND } from "@/lib/recipe-access";

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
      `SELECT ri.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.unit as ingredient_unit
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = $1`,
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
    });
  } catch (error) {
    console.error("GET /api/recipes/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
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
