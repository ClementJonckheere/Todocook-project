"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  ChefHat,
  Clock,
  Flame,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  ArrowLeft,
  Filter,
  Zap,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

interface MissingIngredient {
  id: number;
  name: string;
}

interface RecipeScore {
  total: number;
  ingredientMatch: number;
  preference: number;
  nutrition: number;
  confidence: number;
}

interface RecommendedRecipe {
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
  scores: RecipeScore;
  missingIngredients: MissingIngredient[];
  missingCount: number;
}

interface IngredientSuggestion {
  id: number;
  name: string;
  category: string;
  enablesRecipes: number;
}

interface Stats {
  totalRecommendations: number;
  averageScore: number;
  perfectMatches: number;
  averageConfidence: number;
  userGoals: {
    daily_calories: number;
    daily_protein: number;
    per_meal_calories: number;
    per_meal_protein: number;
  };
  preferencesLearned: {
    hasRatings: boolean;
    hasFavorites: boolean;
    hasMealHistory: boolean;
    totalDataPoints: number;
  };
}

export default function RecommandationsIAPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecommendedRecipe[]>([]);
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [maxMissing, setMaxMissing] = useState(3);
  const [mealType, setMealType] = useState<string>("");
  const [highProtein, setHighProtein] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [maxMissing, mealType, highProtein]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        maxMissing: maxMissing.toString(),
        limit: "20",
        includeSuggestions: "true",
      });

      if (mealType) params.append("mealType", mealType);
      if (highProtein) params.append("highProtein", "true");

      const res = await fetch(apiUrl(`/api/recipes/ml-recommendations?${params}`));
      const data = await res.json();

      setRecipes(data.recipes || []);
      setSuggestions(data.ingredientSuggestions || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 70) return "bg-green-100";
    if (score >= 50) return "bg-yellow-100";
    return "bg-orange-100";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) return { text: "Haute confiance", color: "bg-green-500" };
    if (confidence >= 0.5) return { text: "Confiance moyenne", color: "bg-yellow-500" };
    return { text: "Basique", color: "bg-gray-400" };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="text-white/80 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="text-white" size={28} />
            <h1 className="text-xl font-bold text-white">Recommandations IA</h1>
          </div>
        </div>

        <p className="text-white/80 text-sm">
          Recettes personnalisees basees sur vos ingredients et preferences
        </p>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-2xl font-bold text-white">{stats.totalRecommendations}</p>
              <p className="text-[10px] text-white/80">Recettes</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-2xl font-bold text-white">{stats.perfectMatches}</p>
              <p className="text-[10px] text-white/80">Parfaites</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-2xl font-bold text-white">{stats.averageConfidence}%</p>
              <p className="text-[10px] text-white/80">Confiance</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-600"
        >
          <Filter size={16} />
          <span>Filtres</span>
        </button>

        {showFilters && (
          <div className="mt-3 space-y-3">
            {/* Missing ingredients */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Ingredients manquants max</p>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxMissing(n)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      maxMissing === n
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal type */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Type de repas</p>
              <div className="flex gap-2">
                {[
                  { value: "", label: "Tous" },
                  { value: "light", label: "Leger" },
                  { value: "balanced", label: "Equilibre" },
                  { value: "hearty", label: "Copieux" },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setMealType(type.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      mealType === type.value
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* High protein toggle */}
            <button
              onClick={() => setHighProtein(!highProtein)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                highProtein ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              <Zap size={16} />
              Riche en proteines
            </button>
          </div>
        )}
      </div>

      {/* ML Learning status */}
      {stats?.preferencesLearned && (
        <div className="px-4 mt-3">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                Apprentissage IA
              </span>
            </div>
            <p className="text-xs text-purple-600">
              {stats.preferencesLearned.totalDataPoints > 0 ? (
                <>
                  Base sur {stats.preferencesLearned.totalDataPoints} donnees :
                  {stats.preferencesLearned.hasRatings && " notes"}
                  {stats.preferencesLearned.hasFavorites && " favoris"}
                  {stats.preferencesLearned.hasMealHistory && " historique"}
                </>
              ) : (
                "Notez des recettes et ajoutez des favoris pour ameliorer les recommandations"
              )}
            </p>
          </div>
        </div>
      )}

      {/* Ingredient suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 mt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={16} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                Ingredients a acheter
              </span>
            </div>
            <p className="text-xs text-amber-600 mb-2">
              Ces ingredients debloqueraient plus de recettes
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs text-amber-700 border border-amber-200"
                >
                  {s.name}
                  <span className="text-amber-500">+{s.enablesRecipes}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recipes list */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center">
            <ChefHat size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-500 text-sm mt-2">Aucune recette trouvee</p>
            <p className="text-gray-400 text-xs mt-1">
              Essayez avec plus d&apos;ingredients manquants autorises
            </p>
          </div>
        ) : (
          recipes.map((recipe) => {
            const confidenceBadge = getConfidenceBadge(recipe.scores.confidence);
            return (
              <div
                key={recipe.id}
                onClick={() => router.push(`/recettes/${recipe.id}`)}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
              >
                {/* Score header */}
                <div
                  className={`px-3 py-2 ${getScoreBackground(recipe.scores.total)} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className={getScoreColor(recipe.scores.total)} />
                    <span className={`font-bold ${getScoreColor(recipe.scores.total)}`}>
                      {Math.round(recipe.scores.total)}%
                    </span>
                    <span className="text-xs text-gray-500">match</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full text-white ${confidenceBadge.color}`}
                  >
                    {confidenceBadge.text}
                  </span>
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                  {recipe.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  {/* Scores breakdown */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Ingredients</div>
                      <div className="text-sm font-medium text-gray-700">
                        {Math.round(recipe.scores.ingredientMatch)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Preferences</div>
                      <div className="text-sm font-medium text-gray-700">
                        {Math.round(recipe.scores.preference)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Nutrition</div>
                      <div className="text-sm font-medium text-gray-700">
                        {Math.round(recipe.scores.nutrition)}%
                      </div>
                    </div>
                  </div>

                  {/* Nutrition & time */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Flame size={12} className="text-orange-400" />
                      {recipe.calories} kcal
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={12} className="text-blue-400" />
                      {recipe.protein}g prot
                    </span>
                    {recipe.prep_time && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        {recipe.prep_time + (recipe.cook_time || 0)} min
                      </span>
                    )}
                  </div>

                  {/* Missing ingredients */}
                  {recipe.missingCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-orange-600 mb-1">
                        {recipe.missingCount} ingredient{recipe.missingCount > 1 ? "s" : ""}{" "}
                        manquant{recipe.missingCount > 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {recipe.missingIngredients.map((ing) => (
                          <span
                            key={ing.id}
                            className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full"
                          >
                            {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
