import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const type = searchParams.get("type") || "all";

    const exportData: Record<string, unknown> = {};

    if (type === "all" || type === "recipes") {
      const { rows: recipes } = await query(
        `SELECT r.*, json_agg(
           json_build_object(
             'name', i.name,
             'quantity', ri.quantity,
             'unit', ri.unit,
             'calories', i.calories,
             'protein', i.protein,
             'carbs', i.carbs,
             'fat', i.fat
           )
         ) as ingredients
         FROM recipes r
         LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
         LEFT JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE r.created_by = $1 OR r.id IN (SELECT recipe_id FROM user_recipes WHERE user_id = $1)
         GROUP BY r.id`,
        [userId]
      );
      exportData.recipes = recipes;
    }

    if (type === "all" || type === "pantry") {
      const { rows: pantry } = await query(
        `SELECT i.name, pi.quantity, pi.unit, i.category
         FROM pantry_items pi
         JOIN ingredients i ON pi.ingredient_id = i.id
         WHERE pi.user_id = $1`,
        [userId]
      );
      exportData.pantry = pantry;
    }

    if (type === "all" || type === "meal-plans") {
      const { rows: mealPlans } = await query(
        `SELECT mp.date, mp.meal_type, mp.planned_portions, mp.consumed_portions, mp.nutrition_per_portion, r.name as recipe_name, r.calories
         FROM meal_plans mp
         JOIN recipes r ON mp.recipe_id = r.id
         WHERE mp.user_id = $1
         ORDER BY mp.date`,
        [userId]
      );
      exportData.meal_plans = mealPlans;
    }

    if (type === "all" || type === "logs") {
      const { rows: logs } = await query(
        `SELECT * FROM daily_logs WHERE user_id = $1 ORDER BY date`,
        [userId]
      );
      exportData.legacy_daily_logs = logs;
      const confirmed = await query(
        "SELECT * FROM consumed_daily_totals WHERE user_id = $1 ORDER BY date", [userId]
      );
      exportData.daily_logs = confirmed.rows;
      const foods = await query(
        `SELECT date, meal_type, ingredient_id, name, brand, grams, calories_100g, protein_100g,
          carbs_100g, fat_100g FROM food_journal WHERE user_id = $1 ORDER BY date, id`, [userId]
      );
      exportData.food_journal = foods.rows;
    }

    exportData.exported_at = new Date().toISOString();
    exportData.version = "1.2";

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 });
  }
}
