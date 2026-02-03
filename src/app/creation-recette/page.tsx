"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Plus, X, Minus, Save } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface Ingredient {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
  category: string;
}

interface RecipeIngredient {
  ingredient: Ingredient;
  quantity: number;
  unit: string;
}

export default function CreationRecettePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("2");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        const res = await fetch(apiUrl(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`));
        const data = await res.json();
        setSearchResults(data);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const addIngredient = (ingredient: Ingredient) => {
    if (recipeIngredients.find((ri) => ri.ingredient.id === ingredient.id)) return;
    setRecipeIngredients([
      ...recipeIngredients,
      { ingredient, quantity: 100, unit: ingredient.unit },
    ]);
    setSearchQuery("");
    setShowSearch(false);
  };

  const removeIngredient = (id: number) => {
    setRecipeIngredients(recipeIngredients.filter((ri) => ri.ingredient.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    setRecipeIngredients(
      recipeIngredients.map((ri) =>
        ri.ingredient.id === id ? { ...ri, quantity: Math.max(0, quantity) } : ri
      )
    );
  };

  // Calculate totals
  const totalCalories = recipeIngredients.reduce(
    (sum, ri) => sum + (ri.ingredient.calories * ri.quantity) / 100,
    0
  );
  const totalProtein = recipeIngredients.reduce(
    (sum, ri) => sum + (ri.ingredient.protein * ri.quantity) / 100,
    0
  );
  const totalCarbs = recipeIngredients.reduce(
    (sum, ri) => sum + (ri.ingredient.carbs * ri.quantity) / 100,
    0
  );
  const totalFat = recipeIngredients.reduce(
    (sum, ri) => sum + (ri.ingredient.fat * ri.quantity) / 100,
    0
  );

  const saveRecipe = async () => {
    if (!name || recipeIngredients.length === 0) return;
    setSaving(true);

    await fetch(apiUrl("/api/recipes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        instructions,
        prep_time: prepTime ? parseInt(prepTime) : null,
        cook_time: cookTime ? parseInt(cookTime) : null,
        servings: parseInt(servings) || 2,
        is_public: false,
        created_by: 1,
        ingredients: recipeIngredients.map((ri) => ({
          ingredient_id: ri.ingredient.id,
          quantity: ri.quantity,
          unit: ri.unit,
        })),
      }),
    });

    router.push("/profile");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-600">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Créer une recette</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Basic info */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Nom de la recette *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Poulet grillé aux légumes"
              className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Une courte description..."
              rows={2}
              className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Préparation</label>
              <div className="relative">
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="0"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
                />
                <span className="absolute right-2 top-1/2 mt-0.5 text-xs text-gray-400">min</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Cuisson</label>
              <div className="relative">
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="0"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
                />
                <span className="absolute right-2 top-1/2 mt-0.5 text-xs text-gray-400">min</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Portions</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="1"
                className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1"
              />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">Ingrédients</h2>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(true);
              }}
              onFocus={() => setShowSearch(true)}
              placeholder="Rechercher un aliment..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-lg text-sm border border-gray-200"
            />
          </div>

          {showSearch && searchResults.length > 0 && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto mb-3">
              {searchResults.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => addIngredient(ing)}
                  className="w-full p-2.5 flex items-center justify-between hover:bg-white border-b border-gray-100 last:border-0"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{ing.name}</p>
                    <p className="text-xs text-gray-500">
                      {ing.calories} kcal/100g &middot; {ing.category}
                    </p>
                  </div>
                  <Plus size={16} className="text-primary-500" />
                </button>
              ))}
            </div>
          )}

          {/* Added ingredients */}
          {recipeIngredients.length > 0 ? (
            <div className="space-y-2">
              {recipeIngredients.map((ri) => (
                <div
                  key={ri.ingredient.id}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ri.ingredient.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {Math.round((ri.ingredient.calories * ri.quantity) / 100)} kcal
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(ri.ingredient.id, ri.quantity - 10)}
                      className="w-7 h-7 rounded bg-gray-200 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={ri.quantity}
                      onChange={(e) =>
                        updateQuantity(ri.ingredient.id, parseInt(e.target.value) || 0)
                      }
                      className="w-14 text-center text-sm border rounded py-1"
                    />
                    <span className="text-xs text-gray-500 w-4">{ri.unit}</span>
                    <button
                      onClick={() => updateQuantity(ri.ingredient.id, ri.quantity + 10)}
                      className="w-7 h-7 rounded bg-gray-200 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeIngredient(ri.ingredient.id)}
                      className="text-red-400 ml-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 py-4">
              Recherchez et ajoutez des ingrédients
            </p>
          )}

          {/* Nutritional summary */}
          {recipeIngredients.length > 0 && (
            <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-center">
              <div className="bg-orange-50 rounded-lg p-2">
                <p className="text-sm font-bold text-orange-600">{Math.round(totalCalories)}</p>
                <p className="text-[10px] text-orange-400">kcal</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-sm font-bold text-red-600">{Math.round(totalProtein)}g</p>
                <p className="text-[10px] text-red-400">Prot.</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <p className="text-sm font-bold text-amber-600">{Math.round(totalCarbs)}g</p>
                <p className="text-[10px] text-amber-400">Gluc.</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-sm font-bold text-blue-600">{Math.round(totalFat)}g</p>
                <p className="text-[10px] text-blue-400">Lip.</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">Instructions</h2>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="1. Préchauffer le four...\n2. Couper les légumes...\n3. ..."
            rows={6}
            className="w-full border rounded-lg px-3 py-2.5 text-sm resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={saveRecipe}
          disabled={!name || recipeIngredients.length === 0 || saving}
          className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg transition-colors ${
            name && recipeIngredients.length > 0 && !saving
              ? "bg-primary-500 text-white shadow-primary-500/20 hover:bg-primary-600"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Save size={20} />
          {saving ? "Enregistrement..." : "Enregistrer la recette"}
        </button>
      </div>
    </div>
  );
}
