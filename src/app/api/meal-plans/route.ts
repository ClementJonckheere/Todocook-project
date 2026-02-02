import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export async function GET(request: NextRequest) {
  const db = getDb();
  seedDatabase();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let plans;
  if (startDate && endDate) {
    plans = db.prepare(`
      SELECT mp.*, r.name as recipe_name, r.calories, r.protein, r.carbs, r.fat, r.image_url, r.prep_time, r.cook_time, r.servings
      FROM meal_plans mp
      JOIN recipes r ON mp.recipe_id = r.id
      WHERE mp.user_id = ? AND mp.date >= ? AND mp.date <= ?
      ORDER BY mp.date, mp.meal_type
    `).all(userId, startDate, endDate);
  } else {
    plans = db.prepare(`
      SELECT mp.*, r.name as recipe_name, r.calories, r.protein, r.carbs, r.fat, r.image_url, r.prep_time, r.cook_time, r.servings
      FROM meal_plans mp
      JOIN recipes r ON mp.recipe_id = r.id
      WHERE mp.user_id = ?
      ORDER BY mp.date DESC, mp.meal_type
      LIMIT 50
    `).all(userId);
  }

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { user_id, recipe_id, date, meal_type } = body;

  const result = db.prepare(`
    INSERT INTO meal_plans (user_id, recipe_id, date, meal_type)
    VALUES (?, ?, ?, ?)
  `).run(user_id || 1, recipe_id, date, meal_type || "dejeuner");

  // Update daily log
  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(recipe_id) as any;
  if (recipe) {
    const existing = db.prepare(
      "SELECT * FROM daily_logs WHERE user_id = ? AND date = ?"
    ).get(user_id || 1, date) as any;

    if (existing) {
      db.prepare(`
        UPDATE daily_logs SET
          calories = calories + ?,
          protein = protein + ?,
          carbs = carbs + ?,
          fat = fat + ?
        WHERE id = ?
      `).run(recipe.calories, recipe.protein, recipe.carbs, recipe.fat, existing.id);
    } else {
      db.prepare(`
        INSERT INTO daily_logs (user_id, date, calories, protein, carbs, fat)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user_id || 1, date, recipe.calories, recipe.protein, recipe.carbs, recipe.fat);
    }
  }

  const plan = db.prepare(`
    SELECT mp.*, r.name as recipe_name, r.calories, r.protein, r.carbs, r.fat
    FROM meal_plans mp
    JOIN recipes r ON mp.recipe_id = r.id
    WHERE mp.id = ?
  `).get(result.lastInsertRowid);

  return NextResponse.json(plan, { status: 201 });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    db.prepare("DELETE FROM meal_plans WHERE id = ?").run(id);
  }

  return NextResponse.json({ success: true });
}
