import { NextRequest, NextResponse } from "next/server";
import { gramsPerUnit } from "@/lib/recipe-portions";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

interface StockCheck {
  id: number;
  name: string;
  unit: string;
  barcode: string | null;
  recipeUnit: string;
  stockUnit: string;
  required: number;
  available: number | null;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const maxMissing = searchParams.get("maxMissing") === "all" ? Infinity : Math.min(Math.max(parseInt(searchParams.get("maxMissing") || "0") || 0, 0), 20);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);
    const limit = 10;

    const { rows } = await query(
      `SELECT r.*, jsonb_agg(jsonb_build_object(
          'id', i.id, 'name', i.name, 'unit', i.unit, 'barcode', i.barcode,
          'required', ri.quantity / GREATEST(r.servings, 1), 'recipeUnit', ri.unit,
          'available', pi.quantity, 'stockUnit', pi.unit) ORDER BY i.name) AS ingredients
       FROM recipes r
       JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       JOIN ingredients i ON i.id = ri.ingredient_id
       LEFT JOIN pantry_items pi ON pi.ingredient_id = i.id AND pi.user_id = $1
       WHERE r.is_public OR r.created_by = $1
       GROUP BY r.id ORDER BY r.id`,
      [userId]
    );
    const filtered = rows.map(({ ingredients, ...recipe }) => {
      const missing = ingredients.filter((food: StockCheck) => {
        if (food.available === null) return true;
        if (food.recipeUnit === food.stockUnit) return food.available < food.required;
        const stockFactor = gramsPerUnit(food, food.stockUnit);
        const requiredFactor = gramsPerUnit(food, food.recipeUnit);
        return !stockFactor || !requiredFactor || food.available * stockFactor < food.required * requiredFactor;
      }) as StockCheck[];
      return { ...recipe, total_ingredients: ingredients.length, missing_count: missing.length,
        missing_ingredient_ids: missing.map(food => food.id),
        missing_ingredient_names: missing.map(food => food.name) };
    }).filter(recipe => recipe.missing_count <= maxMissing)
      .sort((a, b) => a.missing_count - b.missing_count);
    const total = filtered.length;
    return NextResponse.json({
      recipes: filtered.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("GET /api/suggestions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
