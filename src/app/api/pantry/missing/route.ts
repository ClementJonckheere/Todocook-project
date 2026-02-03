import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";

  const { rows } = await query(
    `SELECT DISTINCT i.id, i.name, i.category, ri.quantity, ri.unit, r.name as recipe_name
     FROM meal_plans mp
     JOIN recipes r ON mp.recipe_id = r.id
     JOIN recipe_ingredients ri ON r.id = ri.recipe_id
     JOIN ingredients i ON ri.ingredient_id = i.id
     LEFT JOIN pantry_items pi ON pi.ingredient_id = i.id AND pi.user_id = mp.user_id
     WHERE mp.user_id = $1 AND pi.id IS NULL
     ORDER BY i.category, i.name`,
    [userId]
  );

  return NextResponse.json(rows);
}
