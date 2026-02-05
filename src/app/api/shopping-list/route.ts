import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate et endDate sont requis" }, { status: 400 });
    }

    // Get all ingredients needed for meal plans in the date range
    const { rows: needed } = await query(
      `SELECT i.id, i.name, i.category, i.unit,
              SUM(ri.quantity) as total_needed
       FROM meal_plans mp
       JOIN recipe_ingredients ri ON mp.recipe_id = ri.recipe_id
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE mp.user_id = $1 AND mp.date >= $2 AND mp.date <= $3
       GROUP BY i.id, i.name, i.category, i.unit
       ORDER BY i.category, i.name`,
      [userId, startDate, endDate]
    );

    // Get pantry quantities
    const { rows: pantry } = await query(
      `SELECT ingredient_id, quantity FROM pantry_items WHERE user_id = $1`,
      [userId]
    );
    const pantryMap = new Map(pantry.map((p: any) => [p.ingredient_id, p.quantity]));

    // Calculate what needs to be bought
    const shoppingList = needed.map((item: any) => {
      const inPantry = pantryMap.get(item.id) || 0;
      const toBuy = Math.max(0, item.total_needed - inPantry);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        total_needed: parseFloat(item.total_needed),
        in_pantry: inPantry,
        to_buy: toBuy,
      };
    }).filter((item: any) => item.to_buy > 0);

    return NextResponse.json(shoppingList);
  } catch (error) {
    console.error("GET /api/shopping-list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
