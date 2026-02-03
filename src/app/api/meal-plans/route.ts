import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await seedDatabase();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";
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
}

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, recipe_id, date, meal_type } = body;

  const { rows: planRows } = await query(
    `INSERT INTO meal_plans (user_id, recipe_id, date, meal_type)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [user_id || 1, recipe_id, date, meal_type || "dejeuner"]
  );
  const planId = planRows[0].id;

  // Update daily log
  const { rows: recipeRows } = await query("SELECT * FROM recipes WHERE id = $1", [recipe_id]);
  const recipe = recipeRows[0];
  if (recipe) {
    const { rows: existing } = await query(
      "SELECT * FROM daily_logs WHERE user_id = $1 AND date = $2",
      [user_id || 1, date]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE daily_logs SET
          calories = calories + $1,
          protein = protein + $2,
          carbs = carbs + $3,
          fat = fat + $4
        WHERE id = $5`,
        [recipe.calories, recipe.protein, recipe.carbs, recipe.fat, existing[0].id]
      );
    } else {
      await query(
        `INSERT INTO daily_logs (user_id, date, calories, protein, carbs, fat)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user_id || 1, date, recipe.calories, recipe.protein, recipe.carbs, recipe.fat]
      );
    }
  }

  const { rows } = await query(
    `SELECT mp.*, r.name as recipe_name, r.calories, r.protein, r.carbs, r.fat
     FROM meal_plans mp
     JOIN recipes r ON mp.recipe_id = r.id
     WHERE mp.id = $1`,
    [planId]
  );

  return NextResponse.json(rows[0], { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    await query("DELETE FROM meal_plans WHERE id = $1", [id]);
  }

  return NextResponse.json({ success: true });
}
