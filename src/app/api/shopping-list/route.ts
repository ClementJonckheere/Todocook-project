import { NextRequest, NextResponse } from "next/server";
import { gramsPerUnit } from "@/lib/recipe-portions";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate et endDate sont requis" }, { status: 400 });
    }

    const { rows } = await query(
      `SELECT i.id, i.name, i.category, i.unit, i.barcode, ri.unit AS recipe_unit,
              SUM(ri.quantity / GREATEST(r.servings, 1)) AS needed,
              pi.quantity AS stock, pi.unit AS stock_unit
       FROM meal_plans mp
       JOIN recipes r ON mp.recipe_id = r.id
       JOIN recipe_ingredients ri ON r.id = ri.recipe_id
       JOIN ingredients i ON ri.ingredient_id = i.id
       LEFT JOIN pantry_items pi ON pi.user_id = mp.user_id AND pi.ingredient_id = i.id
       WHERE mp.user_id = $1 AND mp.date BETWEEN $2 AND $3
       GROUP BY i.id, ri.unit, pi.id ORDER BY i.category, i.name`,
      [userId, startDate, endDate]
    );
    const items = new Map<string, { id: number; name: string; category: string; unit: string;
      total_needed: number; in_pantry: number }>();
    for (const row of rows) {
      const ingredient = { name: row.name, unit: row.unit, barcode: row.barcode };
      const source = gramsPerUnit(ingredient, row.recipe_unit);
      const target = gramsPerUnit(ingredient, row.unit);
      const unit = source && target ? row.unit : row.recipe_unit;
      const key = JSON.stringify([row.id, unit]);
      const stockFactor = gramsPerUnit(ingredient, row.stock_unit);
      const available = row.stock_unit === unit ? row.stock :
        stockFactor && target && unit === row.unit ? row.stock * stockFactor / target : 0;
      const item = items.get(key) ?? { id: row.id, name: row.name, category: row.category,
        unit, total_needed: 0, in_pantry: available ?? 0 };
      item.total_needed += source && target ? row.needed * source / target : row.needed;
      items.set(key, item);
    }
    const shoppingList = Array.from(items.values(), item => ({
      ...item, to_buy: Math.max(0, item.total_needed - item.in_pantry),
    })).filter(item => item.to_buy > 0);

    return NextResponse.json(shoppingList);
  } catch (error) {
    console.error("GET /api/shopping-list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
