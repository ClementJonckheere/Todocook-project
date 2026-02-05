import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;

    const { rows: recipeRows } = await query("SELECT * FROM recipes WHERE id = $1", [params.id]);
    if (recipeRows.length === 0) {
      return NextResponse.json({ error: "Recette non trouvée" }, { status: 404 });
    }

    const { rows: ingredients } = await query(
      `SELECT ri.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.unit as ingredient_unit
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = $1`,
      [params.id]
    );

    // Get rating info
    const { rows: ratingRows } = await query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as rating_count FROM recipe_ratings WHERE recipe_id = $1`,
      [params.id]
    );

    // Check if user has favorited
    const { rows: favRows } = await query(
      `SELECT id FROM recipe_favorites WHERE recipe_id = $1 AND user_id = $2`,
      [params.id, userId]
    );

    // Get user's rating
    const { rows: userRating } = await query(
      `SELECT rating, comment FROM recipe_ratings WHERE recipe_id = $1 AND user_id = $2`,
      [params.id, userId]
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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await query("DELETE FROM recipes WHERE id = $1", [params.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recipes/[id] error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
