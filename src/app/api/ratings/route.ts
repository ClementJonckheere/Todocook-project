import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const body = await request.json();
    const { recipe_id, rating, comment } = body;

    if (!recipe_id || !rating) {
      return NextResponse.json({ error: "recipe_id et rating sont requis" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "La note doit être entre 1 et 5" }, { status: 400 });
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
