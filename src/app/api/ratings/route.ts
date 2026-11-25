import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { canAccessRecipe, parseRecipeId, RECIPE_NOT_FOUND } from "@/lib/recipe-access";

const MAX_COMMENT_LENGTH = 1000;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json().catch(() => null);
    const recipe_id = parseRecipeId(body?.recipe_id);
    const rating = body?.rating;
    const comment = body?.comment;

    if (!recipe_id || rating == null) {
      return NextResponse.json({ error: "recipe_id et rating sont requis" }, { status: 400 });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "La note doit être un entier entre 1 et 5" }, { status: 400 });
    }

    if (comment != null && (typeof comment !== "string" || comment.length > MAX_COMMENT_LENGTH)) {
      return NextResponse.json({ error: `Le commentaire ne doit pas dépasser ${MAX_COMMENT_LENGTH} caractères` }, { status: 400 });
    }

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
