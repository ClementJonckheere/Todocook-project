import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";

  // Get ingredients needed for user's planned recipes that are not in pantry
  const missing = db.prepare(`
    SELECT DISTINCT i.id, i.name, i.category, ri.quantity, ri.unit, r.name as recipe_name
    FROM meal_plans mp
    JOIN recipes r ON mp.recipe_id = r.id
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    JOIN ingredients i ON ri.ingredient_id = i.id
    LEFT JOIN pantry_items pi ON pi.ingredient_id = i.id AND pi.user_id = mp.user_id
    WHERE mp.user_id = ? AND pi.id IS NULL
    ORDER BY i.category, i.name
  `).all(userId);

  return NextResponse.json(missing);
}
