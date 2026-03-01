import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let result;
    if (startDate && endDate) {
      result = await query(
        `SELECT mp.*, r.name as recipe_name, r.calories, r.protein, r.carbs, r.fat, r.image_url, r.prep_time, r.cook_time, r.servings
         FROM meal_plans mp
         JOIN recipes r ON mp.recipe_id = r.id
         WHERE mp.user_id = $1 AND mp.date >= $2 AND mp.date <= $3
         ORDER BY mp.date, mp.meal_type`,
        [userId, startDate, endDate]
      );
    } else {
      result = await query(
        `SELECT mp.*, r.name as recipe_name, r.calories, r.protein, r.carbs, r.fat, r.image_url, r.prep_time, r.cook_time, r.servings
         FROM meal_plans mp
         JOIN recipes r ON mp.recipe_id = r.id
         WHERE mp.user_id = $1
         ORDER BY mp.date DESC, mp.meal_type
         LIMIT 50`,
        [userId]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/meal-plans error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json();
    const { recipe_id, date, meal_type } = body;

    if (!recipe_id || !date) {
      return NextResponse.json({ error: "recipe_id et date sont requis" }, { status: 400 });
    }

    const { rows: planRows } = await query(
      `INSERT INTO meal_plans (user_id, recipe_id, date, meal_type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, recipe_id, date, meal_type || "dejeuner"]
    );
    const planId = planRows[0].id;

    // Update daily log atomically using ON CONFLICT
    const { rows: recipeRows } = await query("SELECT calories, protein, carbs, fat FROM recipes WHERE id = $1", [recipe_id]);
    const recipe = recipeRows[0];
    if (recipe) {
      await query(
        `INSERT INTO daily_logs (user_id, date, calories, protein, carbs, fat)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, date) DO UPDATE SET
           calories = daily_logs.calories + EXCLUDED.calories,
           protein = daily_logs.protein + EXCLUDED.protein,
           carbs = daily_logs.carbs + EXCLUDED.carbs,
           fat = daily_logs.fat + EXCLUDED.fat`,
        [userId, date, recipe.calories, recipe.protein, recipe.carbs, recipe.fat]
      );
    }

    const { rows } = await query(
      `SELECT mp.*, r.name as recipe_name, r.calories, r.protein, r.carbs, r.fat
       FROM meal_plans mp
       JOIN recipes r ON mp.recipe_id = r.id
       WHERE mp.id = $1`,
      [planId]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/meal-plans error:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout du repas" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id est requis" }, { status: 400 });
    }

    const result = await query("DELETE FROM meal_plans WHERE id = $1 AND user_id = $2", [id, authUser.id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Repas non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/meal-plans error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
