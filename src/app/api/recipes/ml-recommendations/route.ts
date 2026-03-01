import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import {
  getRecommenderInstance,
  shouldRefreshRecommender,
  markRecommenderInitialized,
} from "@/lib/ml-recommender";

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
  image_url: string;
  ingredient_ids: number[];
}

interface Ingredient {
  id: number;
  name: string;
  category: string;
}

/**
 * ML-Powered Recipe Recommendations API
 *
 * Uses TF-IDF and cosine similarity for ingredient matching,
 * combined with learned user preferences.
 *
 * Query params:
 * - maxMissing: max missing ingredients (default: 3)
 * - limit: number of results (default: 10)
 * - mealType: 'light' | 'balanced' | 'hearty'
 * - highProtein: prioritize protein-rich recipes
 * - includeSuggestions: include ingredient purchase suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    }
    const userId = authUser.id;

    const { searchParams } = new URL(request.url);
    const maxMissing = Math.min(
      Math.max(parseInt(searchParams.get("maxMissing") || "3") || 0, 0),
      10
    );
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "10") || 10, 1),
      50
    );
    const mealType = searchParams.get("mealType") as
      | "light"
      | "balanced"
      | "hearty"
      | null;
    const highProtein = searchParams.get("highProtein") === "true";
    const includeSuggestions = searchParams.get("includeSuggestions") === "true";

    // Get recommender instance
    const recommender = getRecommenderInstance();

    // Initialize/refresh the recommender if needed
    if (shouldRefreshRecommender()) {
      // Fetch all recipes with ingredients
      const { rows: recipeRows } = await query(
        `SELECT r.*, ARRAY_AGG(ri.ingredient_id) as ingredient_ids
         FROM recipes r
         JOIN recipe_ingredients ri ON r.id = ri.recipe_id
         WHERE r.is_public = true OR r.created_by = $1
         GROUP BY r.id`,
        [userId]
      );

      const recipes: Recipe[] = recipeRows.map((r: any) => ({
        ...r,
        ingredient_ids: r.ingredient_ids || [],
      }));

      // Fetch all ingredients
      const { rows: ingredientRows } = await query(
        "SELECT id, name, category FROM ingredients"
      );
      const ingredients: Ingredient[] = ingredientRows;

      // Initialize the ML model
      recommender.initialize(recipes, ingredients);
      markRecommenderInitialized();
    }

    // Get user's pantry items
    const { rows: pantryItems } = await query(
      "SELECT ingredient_id FROM pantry_items WHERE user_id = $1",
      [userId]
    );
    const availableIngredients = pantryItems.map(
      (p: { ingredient_id: number }) => p.ingredient_id
    );

    // Get user's nutritional goals
    const { rows: userRows } = await query(
      `SELECT daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal
       FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRows[0] || {
      daily_calorie_goal: 2000,
      daily_protein_goal: 50,
      daily_carbs_goal: 250,
      daily_fat_goal: 70,
    };

    // Learn user preferences from history
    const { rows: ratings } = await query(
      "SELECT recipe_id, rating FROM recipe_ratings WHERE user_id = $1",
      [userId]
    );
    const { rows: favorites } = await query(
      "SELECT recipe_id FROM recipe_favorites WHERE user_id = $1",
      [userId]
    );
    const { rows: mealPlans } = await query(
      "SELECT recipe_id FROM meal_plans WHERE user_id = $1 ORDER BY date DESC LIMIT 50",
      [userId]
    );

    const userPreferences = recommender.learnUserPreferences(
      ratings,
      favorites,
      mealPlans
    );

    // Get recommendations
    const recommendations = recommender.recommend(
      availableIngredients,
      userPreferences,
      {
        calories: user.daily_calorie_goal,
        protein: user.daily_protein_goal,
        carbs: user.daily_carbs_goal,
        fat: user.daily_fat_goal,
      },
      {
        maxMissing,
        limit,
        mealType: mealType || undefined,
        highProtein,
      }
    );

    // Fetch missing ingredient names
    const allMissingIds = Array.from(
      new Set(recommendations.flatMap((r) => r.missingIngredients))
    );
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

    // Format response
    const formattedRecommendations = recommendations.map((rec) => ({
      id: rec.recipe.id,
      name: rec.recipe.name,
      description: rec.recipe.description,
      calories: Math.round(rec.recipe.calories / rec.recipe.servings),
      protein: Math.round((rec.recipe.protein / rec.recipe.servings) * 10) / 10,
      carbs: Math.round((rec.recipe.carbs / rec.recipe.servings) * 10) / 10,
      fat: Math.round((rec.recipe.fat / rec.recipe.servings) * 10) / 10,
      prep_time: rec.recipe.prep_time,
      cook_time: rec.recipe.cook_time,
      servings: rec.recipe.servings,
      scores: {
        total: rec.totalScore,
        ingredientMatch: rec.ingredientMatchScore,
        preference: rec.preferenceScore,
        nutrition: rec.nutritionScore,
        confidence: rec.confidence,
      },
      missingIngredients: rec.missingIngredients.map((id) => ({
        id,
        name: ingredientNameMap.get(id) || "Inconnu",
      })),
      missingCount: rec.missingIngredients.length,
    }));

    // Get ingredient suggestions if requested
    let ingredientSuggestions: any[] = [];
    if (includeSuggestions) {
      const suggestions = recommender.suggestIngredientsToBuy(
        availableIngredients,
        2
      );
      ingredientSuggestions = suggestions.slice(0, 10).map((s) => ({
        id: s.ingredient.id,
        name: s.ingredient.name,
        category: s.ingredient.category,
        enablesRecipes: s.enablesRecipes,
      }));
    }

    // Calculate stats
    const stats = {
      totalRecommendations: recommendations.length,
      averageScore:
        recommendations.length > 0
          ? Math.round(
              recommendations.reduce((sum, r) => sum + r.totalScore, 0) /
                recommendations.length
            )
          : 0,
      perfectMatches: recommendations.filter(
        (r) => r.missingIngredients.length === 0
      ).length,
      averageConfidence:
        recommendations.length > 0
          ? Math.round(
              (recommendations.reduce((sum, r) => sum + r.confidence, 0) /
                recommendations.length) *
                100
            )
          : 0,
      userGoals: {
        daily_calories: user.daily_calorie_goal,
        daily_protein: user.daily_protein_goal,
        per_meal_calories: Math.round(user.daily_calorie_goal / 3),
        per_meal_protein: Math.round(user.daily_protein_goal / 3),
      },
      preferencesLearned: {
        hasRatings: ratings.length > 0,
        hasFavorites: favorites.length > 0,
        hasMealHistory: mealPlans.length > 0,
        totalDataPoints: ratings.length + favorites.length + mealPlans.length,
      },
    };

    return NextResponse.json({
      recipes: formattedRecommendations,
      stats,
      ingredientSuggestions: includeSuggestions ? ingredientSuggestions : undefined,
      filters: {
        maxMissing,
        mealType,
        highProtein,
      },
    });
  } catch (error) {
    console.error("GET /api/recipes/ml-recommendations error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Find similar recipes to a given recipe
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    }
    const userId = authUser.id;

    const body = await request.json();
    const { recipeId, limit = 5 } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: "recipeId est requis" },
        { status: 400 }
      );
    }

    const recommender = getRecommenderInstance();

    // Initialize if needed
    if (shouldRefreshRecommender()) {
      const { rows: recipeRows } = await query(
        `SELECT r.*, ARRAY_AGG(ri.ingredient_id) as ingredient_ids
         FROM recipes r
         JOIN recipe_ingredients ri ON r.id = ri.recipe_id
         WHERE r.is_public = true OR r.created_by = $1
         GROUP BY r.id`,
        [userId]
      );

      const recipes: Recipe[] = recipeRows.map((r: any) => ({
        ...r,
        ingredient_ids: r.ingredient_ids || [],
      }));

      const { rows: ingredientRows } = await query(
        "SELECT id, name, category FROM ingredients"
      );

      recommender.initialize(recipes, ingredientRows);
      markRecommenderInitialized();
    }

    const similarRecipes = recommender.findSimilarRecipes(
      recipeId,
      Math.min(limit, 20)
    );

    const formattedRecipes = similarRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      calories: Math.round(recipe.calories / recipe.servings),
      protein: Math.round((recipe.protein / recipe.servings) * 10) / 10,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
    }));

    return NextResponse.json({
      similarRecipes: formattedRecipes,
      baseRecipeId: recipeId,
    });
  } catch (error) {
    console.error("POST /api/recipes/ml-recommendations error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
