import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;

    const { rows } = await query(
      `SELECT r.*, STRING_AGG(i.name, ', ') as ingredient_names,
       COALESCE(AVG(rr.rating), 0) as avg_rating,
       COUNT(DISTINCT rr.id) as rating_count
       FROM recipe_favorites rf
       JOIN recipes r ON rf.recipe_id = r.id
       LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
       LEFT JOIN ingredients i ON ri.ingredient_id = i.id
       LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
       WHERE rf.user_id = $1
       GROUP BY r.id
       ORDER BY rf.created_at DESC`,
      [userId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const body = await request.json();
    const { recipe_id } = body;

    if (!recipe_id) {
      return NextResponse.json({ error: "recipe_id est requis" }, { status: 400 });
    }

    await query(
      `INSERT INTO recipe_favorites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, recipe_id]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipeId");

    if (!recipeId) {
      return NextResponse.json({ error: "recipeId est requis" }, { status: 400 });
    }

    await query(
      `DELETE FROM recipe_favorites WHERE user_id = $1 AND recipe_id = $2`,
      [userId, recipeId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/favorites error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
