"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ShoppingCart, Check, ChevronLeft, ChevronRight,
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl } from "@/lib/api";

interface ShoppingItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  total_needed: number;
  in_pantry: number;
  to_buy: number;
}

export default function ListeCoursesPage() {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadShoppingList();
  }, [currentWeek]);

  const loadShoppingList = async () => {
    setLoading(true);
    const start = format(currentWeek, "yyyy-MM-dd");
    const end = format(addDays(currentWeek, 6), "yyyy-MM-dd");
    try {
      const res = await fetch(apiUrl(`/api/shopping-list?startDate=${start}&endDate=${end}`));
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

  const toggleItem = (id: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group by category
  const grouped = items.reduce(
    (acc, item) => {
      const cat = item.category || "Autre";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, ShoppingItem[]>
  );

  const totalItems = items.length;
  const checkedCount = checkedItems.size;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="text-gray-600 dark:text-gray-300">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Liste de courses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {checkedCount}/{totalItems} articles
            </p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            <ChevronLeft size={18} className="dark:text-white" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {format(currentWeek, "d MMM", { locale: fr })} -{" "}
              {format(addDays(currentWeek, 6), "d MMM yyyy", { locale: fr })}
            </p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            <ChevronRight size={18} className="dark:text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Calcul de la liste...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <ShoppingCart size={40} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-600 dark:text-gray-300 mt-3">
              Rien à acheter cette semaine
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Ajoutez des recettes à votre calendrier pour générer une liste
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            {totalItems > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{category}</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
                  {categoryItems.map((item, idx) => {
                    const isChecked = checkedItems.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          idx < categoryItems.length - 1 ? "border-b border-gray-100 dark:border-gray-700" : ""
                        } ${isChecked ? "bg-gray-50 dark:bg-gray-750" : ""}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked
                              ? "bg-primary-500 border-primary-500"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isChecked && <Check size={14} className="text-white" />}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-medium text-sm transition-all ${
                              isChecked
                                ? "line-through text-gray-400 dark:text-gray-500"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round(item.to_buy)} {item.unit}
                            {item.in_pantry > 0 && (
                              <span className="text-primary-600 dark:text-primary-400">
                                {" "}(déjà {Math.round(item.in_pantry)} {item.unit} en stock)
                              </span>
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
