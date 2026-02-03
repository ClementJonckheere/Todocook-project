"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, ChefHat, Trash2, Filter } from "lucide-react";
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

export default function GardeMangerPage() {
  const router = useRouter();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [missingItems, setMissingItems] = useState<MissingIngredient[]>([]);
  const [filterMissing, setFilterMissing] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [tab, setTab] = useState<"pantry" | "missing">("pantry");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pantryRes, missingRes] = await Promise.all([
      fetch(apiUrl("/api/pantry?userId=1")),
      fetch(apiUrl("/api/pantry/missing?userId=1")),
    ]);
    setPantryItems(await pantryRes.json());
    setMissingItems(await missingRes.json());
  };

  const removeItem = async (id: number) => {
    await fetch(apiUrl(`/api/pantry?id=${id}`), { method: "DELETE" });
    loadData();
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
                    className={`w-9 h-9 rounded-lg text-sm font-medium ${
                      filterMissing === n
                        ? "bg-primary-500 text-white"
                        : "bg-white text-gray-600 border"
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
            className="w-full bg-primary-500 text-white py-2.5 rounded-lg text-sm font-medium"
          >
            Voir les recettes disponibles ({filterMissing} manquant{filterMissing !== 1 ? "s" : ""} max)
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
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
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
