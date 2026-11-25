import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { canAccessRecipe, RECIPE_NOT_FOUND } from "@/lib/recipe-access";
import { parseJsonBody } from "@/lib/api-validation";
import { ratingSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const parsed = await parseJsonBody(request, ratingSchema);
    if (parsed.response) return parsed.response;
    const { recipe_id, rating, comment } = parsed.data;

    if (!(await canAccessRecipe(recipe_id, userId))) {
      return NextResponse.json(RECIPE_NOT_FOUND, { status: 404 });
    }

    await query(
      `INSERT INTO recipe_ratings (user_id, recipe_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, recipe_id)
       DO UPDATE SET rating = $3, comment = $4, updated_at = NOW()`,
      [userId, recipe_id, rating, comment || null]
    );

    // Get updated average
    const { rows } = await query(
      `SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as rating_count
       FROM recipe_ratings WHERE recipe_id = $1`,
      [recipe_id]
    );

    return NextResponse.json({
      success: true,
      avg_rating: parseFloat(rows[0].avg_rating),
      rating_count: parseInt(rows[0].rating_count),
    });
  } catch (error) {
    console.error("POST /api/ratings error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
