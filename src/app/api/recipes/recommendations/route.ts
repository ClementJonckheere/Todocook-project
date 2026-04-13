import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Recipe {
  id: number;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time: number;
  servings: number;
  ingredient_ids: string;
}

interface ScoredRecipe extends Recipe {
  total_ingredients: number;
  missing_count: number;
  missing_ingredient_ids: number[];
  missing_ingredient_names: string[];
  nutrition_score: number;
  pantry_score: number;
  total_score: number;
  calorie_fit: "low" | "ideal" | "high";
  protein_fit: "low" | "ideal" | "high";
}

/**
 * Recipe Recommendation API
 *
 * Recommends recipes based on:
 * 1. Available pantry ingredients (higher score = fewer missing ingredients)
 * 2. User's nutritional goals (higher score = better macro fit)
 * 3. Optional filters for meal type and calorie range
 *
 * Query params:
 * - maxMissing: max number of missing ingredients (default: 3)
 * - mealType: 'light' | 'balanced' | 'hearty' (affects calorie filtering)
 * - targetCalories: specific calorie target per serving
 * - highProtein: if 'true', prioritize protein-rich recipes
 * - offset: pagination offset
 * - limit: number of results (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

    // Parse and validate query parameters
    const maxMissing = Math.min(Math.max(parseInt(searchParams.get("maxMissing") || "3") || 0, 0), 20);
    const mealType = searchParams.get("mealType") as "light" | "balanced" | "hearty" | null;
    const targetCalories = searchParams.get("targetCalories") ? Math.max(parseInt(searchParams.get("targetCalories")!) || 0, 0) : null;
    const highProtein = searchParams.get("highProtein") === "true";
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10") || 10, 1), 100);

    // Get user's nutritional goals
    const { rows: userRows } = await query(
      `SELECT daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal,
              age, weight, height, gender, activity_level, sport_type
       FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRows[0] || {
      daily_calorie_goal: 2000,
      daily_protein_goal: 50,
      daily_carbs_goal: 250,
      daily_fat_goal: 70,
    };

    // Get user's pantry items
    const { rows: pantryItems } = await query(
      "SELECT ingredient_id FROM pantry_items WHERE user_id = $1",
      [userId]
    );
    const pantryIds = new Set(pantryItems.map((p: { ingredient_id: number }) => p.ingredient_id));

    // Get all recipes with their ingredients
    const { rows: recipes } = await query(
      `SELECT r.*, STRING_AGG(ri.ingredient_id::text, ',') FILTER (WHERE ri.ingredient_id IS NOT NULL) as ingredient_ids
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
       WHERE r.is_public = true OR r.created_by = $1
       GROUP BY r.id`,
      [userId]
    ) as { rows: Recipe[] };

    // Calculate calorie range based on meal type
    // Assuming 3 meals per day, adjust per-meal calorie targets
    const dailyCalories = user.daily_calorie_goal;
    let minCalories = 0;
    let maxCalories = 9999;

    if (mealType === "light") {
      // Light meal: 15-25% of daily calories
      minCalories = Math.round(dailyCalories * 0.15);
      maxCalories = Math.round(dailyCalories * 0.25);
    } else if (mealType === "balanced") {
      // Balanced meal: 25-35% of daily calories
      minCalories = Math.round(dailyCalories * 0.25);
      maxCalories = Math.round(dailyCalories * 0.35);
    } else if (mealType === "hearty") {
      // Hearty meal: 35-45% of daily calories
      minCalories = Math.round(dailyCalories * 0.35);
      maxCalories = Math.round(dailyCalories * 0.45);
    } else if (targetCalories) {
      // Use specific target with 20% tolerance
      minCalories = Math.round(targetCalories * 0.8);
      maxCalories = Math.round(targetCalories * 1.2);
    }

    // Score and filter recipes
    const scoredRecipes: ScoredRecipe[] = [];

    for (const recipe of recipes) {
      const ingredientIds = recipe.ingredient_ids
        ? recipe.ingredient_ids.split(",").map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
        : [];
      const totalIngredients = ingredientIds.length;
      const missingIngredients = ingredientIds.filter((id: number) => !pantryIds.has(id));
      const missingCount = missingIngredients.length;

      // Skip if too many missing ingredients
      if (missingCount > maxMissing) continue;

      // Calculate per-serving values
      const servings = recipe.servings || 1;
      const caloriesPerServing = recipe.calories / servings;
      const proteinPerServing = recipe.protein / servings;
      const carbsPerServing = recipe.carbs / servings;
      const fatPerServing = recipe.fat / servings;

      // Skip if outside calorie range
      if (caloriesPerServing < minCalories || caloriesPerServing > maxCalories) {
        // Unless no filters applied, don't skip
        if (mealType || targetCalories) continue;
      }

      // Calculate pantry score (0-100): higher = more ingredients available
      // Recipes with no ingredients are considered 100% available
      const pantryScore = totalIngredients > 0
        ? Math.round(((totalIngredients - missingCount) / totalIngredients) * 100)
        : 100;

      // Calculate nutrition score (0-100)
      // Based on how well the recipe fits the user's macro targets per meal
      const targetMealCalories = dailyCalories / 3;
      const targetMealProtein = user.daily_protein_goal / 3;
      const targetMealCarbs = user.daily_carbs_goal / 3;
      const targetMealFat = user.daily_fat_goal / 3;

      // Score each macro (100 = perfect fit, decreases as deviation increases)
      const calorieDeviation = Math.abs(caloriesPerServing - targetMealCalories) / targetMealCalories;
      const proteinDeviation = Math.abs(proteinPerServing - targetMealProtein) / targetMealProtein;
      const carbsDeviation = Math.abs(carbsPerServing - targetMealCarbs) / targetMealCarbs;
      const fatDeviation = Math.abs(fatPerServing - targetMealFat) / targetMealFat;

      // Protein is weighted more heavily for high-protein preference
      const proteinWeight = highProtein ? 0.4 : 0.25;
      const nutritionScore = Math.round(
        (1 - (
          calorieDeviation * 0.3 +
          proteinDeviation * proteinWeight +
          carbsDeviation * 0.2 +
          fatDeviation * (0.25 - (highProtein ? 0.15 : 0))
        )) * 100
      );

      // Bonus for high protein recipes when requested
      const proteinBonus = highProtein && proteinPerServing > targetMealProtein ? 10 : 0;

      // Total score: weighted average of pantry and nutrition scores
      const totalScore = Math.round(pantryScore * 0.6 + Math.max(0, nutritionScore + proteinBonus) * 0.4);

      // Determine fit categories
      const calorieFit: "low" | "ideal" | "high" =
        caloriesPerServing < targetMealCalories * 0.8 ? "low" :
        caloriesPerServing > targetMealCalories * 1.2 ? "high" : "ideal";

      const proteinFit: "low" | "ideal" | "high" =
        proteinPerServing < targetMealProtein * 0.8 ? "low" :
        proteinPerServing > targetMealProtein * 1.2 ? "high" : "ideal";

      scoredRecipes.push({
        ...recipe,
        calories: Math.round(caloriesPerServing),
        protein: Math.round(proteinPerServing),
        carbs: Math.round(carbsPerServing),
        fat: Math.round(fatPerServing),
        total_ingredients: totalIngredients,
        missing_count: missingCount,
        missing_ingredient_ids: missingIngredients,
        missing_ingredient_names: [],
        nutrition_score: Math.max(0, nutritionScore),
        pantry_score: pantryScore,
        total_score: totalScore,
        calorie_fit: calorieFit,
        protein_fit: proteinFit,
      });
    }

    // Sort by total score (highest first)
    scoredRecipes.sort((a, b) => b.total_score - a.total_score);

    // Paginate
    const total = scoredRecipes.length;
    const paginatedRecipes = scoredRecipes.slice(offset, offset + limit);

    // Batch-fetch all missing ingredient names in a single query
    const allMissingIds = Array.from(new Set(paginatedRecipes.flatMap(r => r.missing_ingredient_ids)));
    const ingredientNameMap = new Map<number, string>();
    if (allMissingIds.length > 0) {
      const { rows: ingredientRows } = await query(
        "SELECT id, name FROM ingredients WHERE id = ANY($1)",
        [allMissingIds]
      );
      for (const row of ingredientRows) {
        ingredientNameMap.set(row.id, row.name);
      }
    }
    for (const recipe of paginatedRecipes) {
      recipe.missing_ingredient_names = recipe.missing_ingredient_ids.map(
        (id: number) => ingredientNameMap.get(id) || "Inconnu"
      );
    }

    // Calculate summary stats
    const stats = {
      totalRecipes: total,
      averageScore: Math.round(scoredRecipes.reduce((sum, r) => sum + r.total_score, 0) / (total || 1)),
      perfectMatches: scoredRecipes.filter(r => r.missing_count === 0).length,
      userGoals: {
        daily_calories: user.daily_calorie_goal,
        daily_protein: user.daily_protein_goal,
        daily_carbs: user.daily_carbs_goal,
        daily_fat: user.daily_fat_goal,
        per_meal_calories: Math.round(user.daily_calorie_goal / 3),
        per_meal_protein: Math.round(user.daily_protein_goal / 3),
      },
    };

    return NextResponse.json({
      recipes: paginatedRecipes,
      stats,
      total,
      hasMore: offset + limit < total,
      filters: {
        maxMissing,
        mealType,
        targetCalories,
        highProtein,
        calorieRange: { min: minCalories, max: maxCalories },
      },
    });
  } catch (error) {
    console.error("GET /api/recipes/recommendations error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
