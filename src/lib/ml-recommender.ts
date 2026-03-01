/**
 * Machine Learning Recipe Recommender
 *
 * Uses TF-IDF (Term Frequency-Inverse Document Frequency) and cosine similarity
 * to recommend recipes based on available ingredients.
 *
 * Also incorporates user preferences learned from:
 * - Recipe ratings
 * - Favorites
 * - Meal plan history
 */

interface Ingredient {
  id: number;
  name: string;
  category?: string;
}

interface Recipe {
  id: number;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time?: number;
  cook_time?: number;
  servings: number;
  ingredient_ids: number[];
}

interface UserPreferences {
  favoriteIngredients: Map<number, number>; // ingredient_id -> weight
  favoriteCategories: Map<string, number>;  // category -> weight
  avgCaloriesPreferred: number;
  avgProteinPreferred: number;
  dislikedIngredients: Set<number>;
}

interface RecommendationScore {
  recipe: Recipe;
  ingredientMatchScore: number;  // TF-IDF based similarity
  preferenceScore: number;       // Based on user preferences
  nutritionScore: number;        // How well it fits nutritional goals
  missingIngredients: number[];
  totalScore: number;
  confidence: number;            // How confident we are in this recommendation
}

/**
 * TF-IDF Calculator
 * Term Frequency - Inverse Document Frequency
 *
 * TF(ingredient, recipe) = count of ingredient in recipe / total ingredients in recipe
 * IDF(ingredient) = log(total recipes / recipes containing ingredient)
 */
class TFIDFCalculator {
  private documentFrequency: Map<number, number> = new Map();
  private totalDocuments: number = 0;
  private idfCache: Map<number, number> = new Map();

  /**
   * Build the IDF index from all recipes
   */
  buildIndex(recipes: Recipe[]): void {
    this.totalDocuments = recipes.length;
    this.documentFrequency.clear();
    this.idfCache.clear();

    for (const recipe of recipes) {
      const uniqueIngredients = new Set(recipe.ingredient_ids);
      Array.from(uniqueIngredients).forEach((ingredientId) => {
        this.documentFrequency.set(
          ingredientId,
          (this.documentFrequency.get(ingredientId) || 0) + 1
        );
      });
    }

    // Pre-calculate IDF values
    Array.from(this.documentFrequency.entries()).forEach(([ingredientId, df]) => {
      this.idfCache.set(
        ingredientId,
        Math.log(this.totalDocuments / df)
      );
    });
  }

  /**
   * Calculate TF-IDF vector for a set of ingredients
   */
  calculateTFIDF(ingredientIds: number[]): Map<number, number> {
    const tfIdf = new Map<number, number>();
    const ingredientCounts = new Map<number, number>();

    // Calculate term frequency
    for (const id of ingredientIds) {
      ingredientCounts.set(id, (ingredientCounts.get(id) || 0) + 1);
    }

    const totalTerms = ingredientIds.length;

    Array.from(ingredientCounts.entries()).forEach(([ingredientId, count]) => {
      const tf = count / totalTerms;
      const idf = this.idfCache.get(ingredientId) || 0;
      tfIdf.set(ingredientId, tf * idf);
    });

    return tfIdf;
  }

  /**
   * Calculate cosine similarity between two TF-IDF vectors
   */
  cosineSimilarity(
    vectorA: Map<number, number>,
    vectorB: Map<number, number>
  ): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allKeys = new Set([...Array.from(vectorA.keys()), ...Array.from(vectorB.keys())]);

    Array.from(allKeys).forEach((key) => {
      const a = vectorA.get(key) || 0;
      const b = vectorB.get(key) || 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    });

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * User Preference Learner
 * Learns user preferences from their history
 */
class PreferenceLearner {
  /**
   * Learn preferences from user's rating history, favorites, and meal plans
   */
  learnPreferences(
    ratings: Array<{ recipe_id: number; rating: number; recipe: Recipe }>,
    favorites: Array<{ recipe_id: number; recipe: Recipe }>,
    mealPlans: Array<{ recipe_id: number; recipe: Recipe }>,
    allIngredients: Map<number, Ingredient>
  ): UserPreferences {
    const favoriteIngredients = new Map<number, number>();
    const favoriteCategories = new Map<string, number>();
    const dislikedIngredients = new Set<number>();
    let totalCalories = 0;
    let totalProtein = 0;
    let recipeCount = 0;

    // Process highly rated recipes (4-5 stars)
    for (const { rating, recipe } of ratings) {
      const weight = rating >= 4 ? 1.5 : rating <= 2 ? -1 : 0.5;

      for (const ingredientId of recipe.ingredient_ids) {
        const currentWeight = favoriteIngredients.get(ingredientId) || 0;
        favoriteIngredients.set(ingredientId, currentWeight + weight);

        const ingredient = allIngredients.get(ingredientId);
        if (ingredient?.category) {
          const categoryWeight = favoriteCategories.get(ingredient.category) || 0;
          favoriteCategories.set(ingredient.category, categoryWeight + weight);
        }

        // Track disliked ingredients from low-rated recipes
        if (rating <= 2) {
          dislikedIngredients.add(ingredientId);
        }
      }

      if (rating >= 3) {
        totalCalories += recipe.calories / recipe.servings;
        totalProtein += recipe.protein / recipe.servings;
        recipeCount++;
      }
    }

    // Process favorites (strong positive signal)
    for (const { recipe } of favorites) {
      for (const ingredientId of recipe.ingredient_ids) {
        const currentWeight = favoriteIngredients.get(ingredientId) || 0;
        favoriteIngredients.set(ingredientId, currentWeight + 2);

        const ingredient = allIngredients.get(ingredientId);
        if (ingredient?.category) {
          const categoryWeight = favoriteCategories.get(ingredient.category) || 0;
          favoriteCategories.set(ingredient.category, categoryWeight + 2);
        }
      }

      totalCalories += recipe.calories / recipe.servings;
      totalProtein += recipe.protein / recipe.servings;
      recipeCount++;
    }

    // Process meal plans (moderate positive signal)
    for (const { recipe } of mealPlans) {
      for (const ingredientId of recipe.ingredient_ids) {
        const currentWeight = favoriteIngredients.get(ingredientId) || 0;
        favoriteIngredients.set(ingredientId, currentWeight + 1);
      }

      totalCalories += recipe.calories / recipe.servings;
      totalProtein += recipe.protein / recipe.servings;
      recipeCount++;
    }

    // Remove disliked ingredients if they have overall negative weight
    const dislikedToRemove: number[] = [];
    Array.from(dislikedIngredients).forEach((ingredientId) => {
      const weight = favoriteIngredients.get(ingredientId) || 0;
      if (weight <= 0) {
        favoriteIngredients.delete(ingredientId);
      } else {
        dislikedToRemove.push(ingredientId);
      }
    });
    dislikedToRemove.forEach((id) => dislikedIngredients.delete(id));

    return {
      favoriteIngredients,
      favoriteCategories,
      avgCaloriesPreferred: recipeCount > 0 ? totalCalories / recipeCount : 500,
      avgProteinPreferred: recipeCount > 0 ? totalProtein / recipeCount : 25,
      dislikedIngredients,
    };
  }

  /**
   * Calculate preference score for a recipe
   */
  calculatePreferenceScore(
    recipe: Recipe,
    preferences: UserPreferences,
    allIngredients: Map<number, Ingredient>
  ): number {
    let score = 50; // Base score

    // Boost for favorite ingredients
    for (const ingredientId of recipe.ingredient_ids) {
      const weight = preferences.favoriteIngredients.get(ingredientId) || 0;
      score += weight * 5;

      const ingredient = allIngredients.get(ingredientId);
      if (ingredient?.category) {
        const categoryWeight = preferences.favoriteCategories.get(ingredient.category) || 0;
        score += categoryWeight * 2;
      }
    }

    // Penalty for disliked ingredients
    for (const ingredientId of recipe.ingredient_ids) {
      if (preferences.dislikedIngredients.has(ingredientId)) {
        score -= 20;
      }
    }

    // Normalize to 0-100
    return Math.max(0, Math.min(100, score));
  }
}

/**
 * Main ML Recommender
 */
export class MLRecipeRecommender {
  private tfidf: TFIDFCalculator;
  private preferenceLearner: PreferenceLearner;
  private recipes: Recipe[] = [];
  private recipeTFIDFVectors: Map<number, Map<number, number>> = new Map();
  private allIngredients: Map<number, Ingredient> = new Map();

  constructor() {
    this.tfidf = new TFIDFCalculator();
    this.preferenceLearner = new PreferenceLearner();
  }

  /**
   * Initialize the recommender with data
   */
  initialize(recipes: Recipe[], ingredients: Ingredient[]): void {
    this.recipes = recipes;
    this.allIngredients = new Map(ingredients.map(i => [i.id, i]));

    // Build TF-IDF index
    this.tfidf.buildIndex(recipes);

    // Pre-calculate TF-IDF vectors for all recipes
    this.recipeTFIDFVectors.clear();
    for (const recipe of recipes) {
      this.recipeTFIDFVectors.set(
        recipe.id,
        this.tfidf.calculateTFIDF(recipe.ingredient_ids)
      );
    }
  }

  /**
   * Get recipe recommendations based on available ingredients
   */
  recommend(
    availableIngredients: number[],
    userPreferences: UserPreferences | null,
    userNutritionGoals: { calories: number; protein: number; carbs: number; fat: number },
    options: {
      maxMissing?: number;
      limit?: number;
      mealType?: 'light' | 'balanced' | 'hearty';
      highProtein?: boolean;
    } = {}
  ): RecommendationScore[] {
    const {
      maxMissing = 3,
      limit = 10,
      mealType,
      highProtein = false,
    } = options;

    const availableSet = new Set(availableIngredients);
    const availableTFIDF = this.tfidf.calculateTFIDF(availableIngredients);

    // Calculate calorie range based on meal type
    const targetMealCalories = userNutritionGoals.calories / 3;
    let minCalories = 0;
    let maxCalories = 9999;

    if (mealType === 'light') {
      minCalories = targetMealCalories * 0.5;
      maxCalories = targetMealCalories * 0.8;
    } else if (mealType === 'balanced') {
      minCalories = targetMealCalories * 0.8;
      maxCalories = targetMealCalories * 1.2;
    } else if (mealType === 'hearty') {
      minCalories = targetMealCalories * 1.0;
      maxCalories = targetMealCalories * 1.5;
    }

    const scores: RecommendationScore[] = [];

    for (const recipe of this.recipes) {
      const missingIngredients = recipe.ingredient_ids.filter(id => !availableSet.has(id));

      // Skip if too many missing ingredients
      if (missingIngredients.length > maxMissing) continue;

      const caloriesPerServing = recipe.calories / recipe.servings;

      // Skip if outside calorie range (when meal type specified)
      if (mealType && (caloriesPerServing < minCalories || caloriesPerServing > maxCalories)) {
        continue;
      }

      // Calculate TF-IDF similarity score
      const recipeTFIDF = this.recipeTFIDFVectors.get(recipe.id)!;
      const similarity = this.tfidf.cosineSimilarity(availableTFIDF, recipeTFIDF);

      // Boost similarity based on how many ingredients we have
      const coverageBonus = (recipe.ingredient_ids.length - missingIngredients.length) / recipe.ingredient_ids.length;
      const ingredientMatchScore = (similarity * 60 + coverageBonus * 40);

      // Calculate preference score
      let preferenceScore = 50;
      if (userPreferences) {
        preferenceScore = this.preferenceLearner.calculatePreferenceScore(
          recipe,
          userPreferences,
          this.allIngredients
        );
      }

      // Calculate nutrition score
      const proteinPerServing = recipe.protein / recipe.servings;
      const targetProtein = userNutritionGoals.protein / 3;

      let nutritionScore = 50;

      // Calorie fit
      const calorieDeviation = Math.abs(caloriesPerServing - targetMealCalories) / targetMealCalories;
      nutritionScore += (1 - Math.min(calorieDeviation, 1)) * 25;

      // Protein fit (weighted more for highProtein option)
      const proteinDeviation = Math.abs(proteinPerServing - targetProtein) / targetProtein;
      const proteinWeight = highProtein ? 35 : 25;
      nutritionScore += (1 - Math.min(proteinDeviation, 1)) * proteinWeight;

      // High protein bonus
      if (highProtein && proteinPerServing > targetProtein) {
        nutritionScore += 10;
      }

      nutritionScore = Math.min(100, nutritionScore);

      // Calculate total score with weights
      // 50% ingredient match, 30% preferences, 20% nutrition
      const totalScore =
        ingredientMatchScore * 0.5 +
        preferenceScore * 0.3 +
        nutritionScore * 0.2;

      // Calculate confidence based on data quality
      const hasUserPreferences = userPreferences !== null;
      const ingredientCoverage = (recipe.ingredient_ids.length - missingIngredients.length) / recipe.ingredient_ids.length;
      const confidence = (ingredientCoverage * 0.6 + (hasUserPreferences ? 0.4 : 0.2));

      scores.push({
        recipe,
        ingredientMatchScore: Math.round(ingredientMatchScore * 100) / 100,
        preferenceScore: Math.round(preferenceScore * 100) / 100,
        nutritionScore: Math.round(nutritionScore * 100) / 100,
        missingIngredients,
        totalScore: Math.round(totalScore * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    // Sort by total score
    scores.sort((a, b) => b.totalScore - a.totalScore);

    return scores.slice(0, limit);
  }

  /**
   * Learn user preferences from their history
   */
  learnUserPreferences(
    ratings: Array<{ recipe_id: number; rating: number }>,
    favorites: Array<{ recipe_id: number }>,
    mealPlans: Array<{ recipe_id: number }>
  ): UserPreferences {
    const recipeMap = new Map(this.recipes.map(r => [r.id, r]));

    const ratingsWithRecipes = ratings
      .map(r => ({ ...r, recipe: recipeMap.get(r.recipe_id)! }))
      .filter(r => r.recipe);

    const favoritesWithRecipes = favorites
      .map(f => ({ ...f, recipe: recipeMap.get(f.recipe_id)! }))
      .filter(f => f.recipe);

    const mealPlansWithRecipes = mealPlans
      .map(m => ({ ...m, recipe: recipeMap.get(m.recipe_id)! }))
      .filter(m => m.recipe);

    return this.preferenceLearner.learnPreferences(
      ratingsWithRecipes,
      favoritesWithRecipes,
      mealPlansWithRecipes,
      this.allIngredients
    );
  }

  /**
   * Find recipes that use similar ingredients to a given recipe
   */
  findSimilarRecipes(recipeId: number, limit: number = 5): Recipe[] {
    const targetRecipe = this.recipes.find(r => r.id === recipeId);
    if (!targetRecipe) return [];

    const targetTFIDF = this.recipeTFIDFVectors.get(recipeId)!;
    const similarities: Array<{ recipe: Recipe; similarity: number }> = [];

    for (const recipe of this.recipes) {
      if (recipe.id === recipeId) continue;

      const recipeTFIDF = this.recipeTFIDFVectors.get(recipe.id)!;
      const similarity = this.tfidf.cosineSimilarity(targetTFIDF, recipeTFIDF);

      similarities.push({ recipe, similarity });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit).map(s => s.recipe);
  }

  /**
   * Suggest ingredients to buy based on almost-makeable recipes
   */
  suggestIngredientsToBuy(
    availableIngredients: number[],
    maxMissing: number = 2
  ): Array<{ ingredient: Ingredient; enablesRecipes: number }> {
    const availableSet = new Set(availableIngredients);
    const ingredientImpact = new Map<number, number>();

    for (const recipe of this.recipes) {
      const missing = recipe.ingredient_ids.filter(id => !availableSet.has(id));

      if (missing.length > 0 && missing.length <= maxMissing) {
        for (const ingredientId of missing) {
          ingredientImpact.set(
            ingredientId,
            (ingredientImpact.get(ingredientId) || 0) + 1
          );
        }
      }
    }

    return Array.from(ingredientImpact.entries())
      .map(([id, count]) => ({
        ingredient: this.allIngredients.get(id)!,
        enablesRecipes: count,
      }))
      .filter(item => item.ingredient)
      .sort((a, b) => b.enablesRecipes - a.enablesRecipes);
  }
}

// Singleton instance for caching
let recommenderInstance: MLRecipeRecommender | null = null;
let lastInitTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getRecommenderInstance(): MLRecipeRecommender {
  if (!recommenderInstance) {
    recommenderInstance = new MLRecipeRecommender();
  }
  return recommenderInstance;
}

export function shouldRefreshRecommender(): boolean {
  return Date.now() - lastInitTime > CACHE_DURATION;
}

export function markRecommenderInitialized(): void {
  lastInitTime = Date.now();
}
