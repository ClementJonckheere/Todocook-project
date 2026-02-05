import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const type = searchParams.get("type") || "all";

    const exportData: any = {};

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
        `SELECT mp.date, mp.meal_type, r.name as recipe_name, r.calories
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
      exportData.daily_logs = logs;
    }

    exportData.exported_at = new Date().toISOString();
    exportData.version = "1.0";

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 });
  }
}
