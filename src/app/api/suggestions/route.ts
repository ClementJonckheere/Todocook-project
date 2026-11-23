import { NextRequest, NextResponse } from "next/server";
import { gramsPerUnit } from "@/lib/recipe-portions";
import { dinnerSuggestion } from "@/lib/dinner-suggestion";
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

    const dinner = searchParams.get("personalize") === "dinner";
    const rawMinutes = searchParams.get("maxMinutes");
    const minutes = rawMinutes === null ? null : Number(rawMinutes);
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) {
      return NextResponse.json({ error: "Durée invalide." }, { status: 400 });
    }
    const profile = dinner
      ? (await query("SELECT age, nutrition_goal, daily_calorie_goal, daily_protein_goal FROM users WHERE id = $1", [userId])).rows[0]
      : null;
    const personalized = profile?.age >= 18 && profile.daily_calorie_goal > 0 && profile.daily_protein_goal > 0;
    const { rows } = await query(
      `SELECT r.*, jsonb_agg(jsonb_build_object(
          'id', i.id, 'name', i.name, 'unit', i.unit, 'barcode', i.barcode,
          'required', ri.quantity / GREATEST(r.servings, 1), 'recipeUnit', ri.unit,
          'available', pi.quantity, 'stockUnit', pi.unit) ORDER BY i.name) AS ingredients
       FROM recipes r
       JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       JOIN ingredients i ON i.id = ri.ingredient_id
       LEFT JOIN pantry_items pi ON pi.ingredient_id = i.id AND pi.user_id = $1
       WHERE (r.is_public OR r.created_by = $1)
         AND ($2::integer IS NULL OR (r.prep_time >= 0 AND r.cook_time >= 0 AND r.prep_time + r.cook_time <= $2))
         AND (NOT $3::boolean OR NOT EXISTS (
           SELECT 1 FROM recipe_ingredients line
           JOIN dinner_exclusions x ON x.ingredient_id = line.ingredient_id AND x.user_id = $1
           WHERE line.recipe_id = r.id
         ))
       GROUP BY r.id ORDER BY r.id`,
      [userId, minutes, dinner]
    );
    const filtered = rows.map(({ ingredients, ...recipe }) => {
      const servings = Math.max(1, recipe.servings || 1);
      const suggestion = personalized
        ? dinnerSuggestion(recipe.calories / servings, recipe.protein / servings, profile.daily_calorie_goal, profile.daily_protein_goal)
        : { portions: 1, distance: 0 };
      const missing = ingredients.filter((food: StockCheck) => {
        const needed = food.required * suggestion.portions;
        if (food.available === null) return true;
        if (food.recipeUnit === food.stockUnit) return food.available < needed;
        const stockFactor = gramsPerUnit(food, food.stockUnit);
        const requiredFactor = gramsPerUnit(food, food.recipeUnit);
        return !stockFactor || !requiredFactor || food.available * stockFactor < needed * requiredFactor;
      }) as StockCheck[];
      const dinnerIngredients = dinner ? ingredients.map((food: StockCheck) => ({
        id: food.id, name: food.name, quantity: food.required * suggestion.portions, unit: food.recipeUnit,
      })) : undefined;
      return { ...recipe, dinner_ingredients: dinnerIngredients, suggested_portions: suggestion.portions, distance: suggestion.distance, total_ingredients: ingredients.length, missing_count: missing.length,
        missing_ingredient_ids: missing.map(food => food.id),
        missing_ingredient_names: missing.map(food => food.name) };
    }).filter(recipe => recipe.missing_count <= maxMissing)
      .sort((a, b) => (personalized ? a.distance - b.distance : 0) || a.missing_count - b.missing_count);
    const total = filtered.length;
    return NextResponse.json({
      recipes: filtered.slice(offset, offset + limit).map(({ distance, ...recipe }) => recipe),
      dinner_target: personalized ? { goal: profile.nutrition_goal, calories: Math.round(profile.daily_calorie_goal / 3),
        protein: Math.round(profile.daily_protein_goal / 3) } : null,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("GET /api/suggestions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
