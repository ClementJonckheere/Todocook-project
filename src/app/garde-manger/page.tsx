"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, ChefHat, Trash2, Filter, Brain, Plus, Search, X, ScanBarcode } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

interface PantryItem {
  id: number;
  ingredient_id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  quantity: number;
  unit: string;
}

interface MissingIngredient {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  recipe_name: string;
}

interface Ingredient {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string | null;
  unit: string;
}

export default function GardeMangerPage() {
  const router = useRouter();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [missingItems, setMissingItems] = useState<MissingIngredient[]>([]);
  const [filterMissing, setFilterMissing] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [tab, setTab] = useState<"pantry" | "missing">("pantry");

  // Recherche et ajout rapide
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Recherche d'ingrédients
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await fetch(apiUrl(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`));
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch {
          setSearchResults([]);
        }
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const addIngredientToPantry = async (ingredient: Ingredient) => {
    try {
      await fetch(apiUrl("/api/pantry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ingredient_id: ingredient.id,
          quantity: 1,
          unit: ingredient.unit || "pièce",
        }),
      });
      setAddedMessage(`${ingredient.name} ajouté !`);
      setSearchQuery("");
      setSearchResults([]);
      loadData();
      setTimeout(() => setAddedMessage(null), 2000);
    } catch (err) {
      console.error("Failed to add ingredient:", err);
    }
  };

  const loadData = async () => {
    try {
      const [pantryRes, missingRes] = await Promise.all([
        fetch(apiUrl("/api/pantry"), { credentials: "include" }),
        fetch(apiUrl("/api/pantry/missing"), { credentials: "include" }),
      ]);

      if (pantryRes.ok) {
        const pantryData = await pantryRes.json();
        setPantryItems(Array.isArray(pantryData) ? pantryData : []);
      } else {
        setPantryItems([]);
      }

      if (missingRes.ok) {
        const missingData = await missingRes.json();
        setMissingItems(Array.isArray(missingData) ? missingData : []);
      } else {
        setMissingItems([]);
      }
    } catch (err) {
      console.error("Failed to load pantry data:", err);
      setPantryItems([]);
      setMissingItems([]);
    }
  };

  const removeItem = async (id: number) => {
    try {
      await fetch(apiUrl(`/api/pantry?id=${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      loadData();
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };

  // Group pantry by category
  const grouped = pantryItems.reduce(
    (acc, item) => {
      const cat = item.category || "Autre";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, PantryItem[]>
  );

  // Group missing by recipe
  const missingByRecipe = missingItems.reduce(
    (acc, item) => {
      if (!acc[item.recipe_name]) acc[item.recipe_name] = [];
      acc[item.recipe_name].push(item);
      return acc;
    },
    {} as Record<string, MissingIngredient[]>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Garde-manger</h1>
            <p className="text-sm text-gray-500">{pantryItems.length} aliments</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/scanner"
              className="p-3 bg-primary-50 rounded-xl text-primary-600 touch-target min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <ScanBarcode size={22} />
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-3 bg-primary-500 rounded-xl text-white touch-target min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setTab("pantry")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "pantry" ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Mes aliments
          </button>
          <button
            onClick={() => setTab("missing")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              tab === "missing" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Manquants
            {missingItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {missingItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Recipe suggestions button */}
      <div className="px-4 mt-4">
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ChefHat size={20} className="text-primary-600" />
              <span className="font-medium text-primary-700 text-sm">Suggestions de recettes</span>
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="text-primary-600"
            >
              <Filter size={18} />
            </button>
          </div>

          {showFilter && (
            <div className="mb-3">
              <p className="text-xs text-primary-600 mb-2">Aliments manquants autorisés :</p>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilterMissing(n)}
                    className={`w-11 h-11 rounded-xl text-sm font-medium min-w-[44px] min-h-[44px] touch-target transition-colors ${
                      filterMissing === n
                        ? "bg-primary-500 text-white"
                        : "bg-white text-gray-600 border active:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push(`/suggestions-recettes?maxMissing=${filterMissing}`)}
            className="w-full bg-primary-500 text-white py-4 rounded-xl text-sm font-medium min-h-[52px] touch-target active:bg-primary-600 transition-colors"
          >
            Voir les recettes disponibles ({filterMissing} manquant{filterMissing !== 1 ? "s" : ""} max)
          </button>
        </div>

        {/* ML Recommendations button */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={20} className="text-purple-600" />
            <span className="font-medium text-purple-700 text-sm">Recommandations IA</span>
          </div>
          <p className="text-xs text-purple-600 mb-3">
            Suggestions personnalisees basees sur vos preferences et historique
          </p>
          <button
            onClick={() => router.push("/recommandations-ia")}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium"
          >
            Decouvrir les recommandations IA
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-4">
        {tab === "pantry" ? (
          // Pantry items
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 ${
                        idx < items.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} {item.unit} &middot; {item.calories} kcal/100g
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 active:bg-red-50 p-3 -m-2 rounded-xl touch-target min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {pantryItems.length === 0 && (
              <div className="bg-white rounded-xl p-6 text-center">
                <Package size={32} className="mx-auto text-gray-300" />
                <p className="text-gray-500 text-sm mt-2">Votre garde-manger est vide</p>
                <p className="text-gray-400 text-xs mt-1">
                  Utilisez le scanner pour ajouter des produits
                </p>
              </div>
            )}
          </div>
        ) : (
          // Missing items
          <div className="space-y-4">
            {Object.entries(missingByRecipe).map(([recipeName, items]) => (
              <div key={recipeName}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Pour : {recipeName}
                </h3>
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.id}-${recipeName}-${idx}`}
                      className={`flex items-center gap-3 p-3 ${
                        idx < items.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <AlertTriangle size={16} className="text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {missingItems.length === 0 && (
              <div className="bg-white rounded-xl p-6 text-center">
                <Check size={32} className="mx-auto text-primary-500" />
                <p className="text-primary-600 text-sm mt-2">
                  Vous avez tout ce qu&apos;il vous faut !
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast de confirmation */}
      {addedMessage && (
        <div className="fixed bottom-24 left-4 right-4 bg-primary-500 text-white py-3 px-4 rounded-xl text-center font-medium shadow-lg z-50 animate-slide-up">
          {addedMessage}
        </div>
      )}

      {/* Modale d'ajout d'ingrédient */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 animate-slide-up max-h-[80vh] flex flex-col">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Ajouter un ingrédient</h3>
              <button
                onClick={() => { setShowAddModal(false); setSearchQuery(""); setSearchResults([]); }}
                className="p-2 text-gray-400 hover:text-gray-600 touch-target"
              >
                <X size={24} />
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un ingrédient..."
                className="w-full pl-10 pr-4 py-3.5 bg-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:bg-white border-0 outline-none transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Résultats de recherche */}
            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-gray-500 mt-3">Recherche...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((ingredient) => (
                    <button
                      key={ingredient.id}
                      onClick={() => addIngredientToPantry(ingredient)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-primary-50 active:bg-primary-100 rounded-xl transition-colors touch-target"
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{ingredient.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ingredient.calories} kcal/100g
                          {ingredient.category && ` · ${ingredient.category}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-primary-500 text-white px-3 py-2 rounded-lg">
                        <Plus size={16} />
                        <span className="text-sm font-medium">Ajouter</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="p-8 text-center">
                  <Package size={40} className="mx-auto text-gray-300" />
                  <p className="text-gray-500 text-sm mt-3">Aucun ingrédient trouvé</p>
                  <p className="text-gray-400 text-xs mt-1">Essayez un autre terme</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search size={40} className="mx-auto text-gray-300" />
                  <p className="text-gray-500 text-sm mt-3">Recherchez un ingrédient</p>
                  <p className="text-gray-400 text-xs mt-1">Ex: tomate, poulet, riz...</p>
                </div>
              )}
            </div>

            {/* Lien vers scanner */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href="/scanner"
                onClick={() => setShowAddModal(false)}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-medium touch-target"
              >
                <ScanBarcode size={20} />
                Ou scanner un code-barres
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Check({ size, className }: { size: number; className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
