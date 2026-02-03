"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertTriangle, ChefHat, Clock, Users, Flame } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface SuggestedRecipe {
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
  missing_count: number;
  total_ingredients: number;
  missing_ingredient_names: string[];
}

export default function SuggestionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-gray-400">Chargement...</div></div>}>
      <SuggestionsContent />
    </Suspense>
  );
}

function SuggestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const maxMissing = parseInt(searchParams.get("maxMissing") || "0");

  const [recipes, setRecipes] = useState<SuggestedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState(maxMissing);

  const loadRecipes = async (currentOffset: number, currentFilter: number) => {
    setLoading(true);
    const res = await fetch(
      apiUrl(`/api/suggestions?userId=1&maxMissing=${currentFilter}&offset=${currentOffset}`)
    );
    const data = await res.json();
    setRecipes(data.recipes);
    setHasMore(data.hasMore);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => {
    loadRecipes(0, filter);
  }, [filter]);

  const loadMore = () => {
    const newOffset = offset + 10;
    setOffset(newOffset);
    loadRecipes(newOffset, filter);
  };

  const reload = () => {
    setOffset(0);
    loadRecipes(0, filter);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="text-gray-600">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Suggestions</h1>
            <p className="text-sm text-gray-500">{total} recette{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Filter */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Aliments manquants autorisés :</p>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setFilter(n);
                  setOffset(0);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === n
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe list */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Recherche de recettes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <ChefHat size={40} className="mx-auto text-gray-300" />
            <p className="font-medium text-gray-600 mt-3">Aucune recette trouvée</p>
            <p className="text-sm text-gray-400 mt-1">
              Essayez d&apos;augmenter le nombre d&apos;aliments manquants autorisés
            </p>
          </div>
        ) : (
          <>
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{recipe.name}</h3>
                      {recipe.description && (
                        <p className="text-xs text-gray-500 mt-1">{recipe.description}</p>
                      )}
                    </div>
                    {recipe.missing_count > 0 && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0">
                        {recipe.missing_count} manquant{recipe.missing_count > 1 ? "s" : ""}
                      </span>
                    )}
                    {recipe.missing_count === 0 && (
                      <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0">
                        Complet
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Flame size={14} className="text-orange-500" />
                      {recipe.calories} kcal
                    </div>
                    {recipe.prep_time && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={14} />
                        {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users size={14} />
                      {recipe.servings} pers.
                    </div>
                  </div>

                  {/* Missing ingredients */}
                  {recipe.missing_count > 0 && recipe.missing_ingredient_names.length > 0 && (
                    <div className="mt-3 bg-orange-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle size={12} className="text-orange-500" />
                        <span className="text-xs font-medium text-orange-700">Il vous manque :</span>
                      </div>
                      <p className="text-xs text-orange-600">
                        {recipe.missing_ingredient_names.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Load more / Reload */}
            <div className="flex gap-2 mt-4">
              {hasMore ? (
                <button
                  onClick={loadMore}
                  className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-medium"
                >
                  Voir plus de recettes
                </button>
              ) : (
                <button
                  onClick={reload}
                  className="flex-1 bg-white text-gray-700 py-3 rounded-xl font-medium border border-gray-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Recharger
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
