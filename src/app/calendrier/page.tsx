"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Flame, X, Clock, Users,
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

interface MealPlan {
  id: number;
  recipe_id: number;
  recipe_name: string;
  date: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time: number;
  servings: number;
}

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "Petit-déj", color: "bg-amber-100 text-amber-700" },
  { value: "dejeuner", label: "Déjeuner", color: "bg-primary-100 text-primary-700" },
  { value: "diner", label: "Dîner", color: "bg-purple-100 text-purple-700" },
  { value: "collation", label: "Collation", color: "bg-blue-100 text-blue-700" },
];

export default function CalendrierPage() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const today = format(new Date(), "yyyy-MM-dd");

  const loadMeals = useCallback(async () => {
    const start = format(currentWeek, "yyyy-MM-dd");
    const end = format(addDays(currentWeek, 6), "yyyy-MM-dd");
    const res = await fetch(`/api/meal-plans?userId=1&startDate=${start}&endDate=${end}`);
    const data = await res.json();
    setMeals(data);
  }, [currentWeek]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  const removeMeal = async (id: number) => {
    await fetch(`/api/meal-plans?id=${id}`, { method: "DELETE" });
    loadMeals();
  };

  // Week totals
  const weekCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const weekProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const weekCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const weekFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Calendrier</h1>

        {/* Week navigation */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-lg bg-gray-100"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {format(currentWeek, "d MMM", { locale: fr })} -{" "}
              {format(addDays(currentWeek, 6), "d MMM yyyy", { locale: fr })}
            </p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-lg bg-gray-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Week summary */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-orange-600">{Math.round(weekCalories)}</p>
            <p className="text-[10px] text-orange-400">kcal</p>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-red-600">{Math.round(weekProtein)}g</p>
            <p className="text-[10px] text-red-400">Prot.</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-amber-600">{Math.round(weekCarbs)}g</p>
            <p className="text-[10px] text-amber-400">Gluc.</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-blue-600">{Math.round(weekFat)}g</p>
            <p className="text-[10px] text-blue-400">Lip.</p>
          </div>
        </div>
      </div>

      {/* Day cards */}
      <div className="px-4 mt-4 space-y-3">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayMeals = meals.filter((m) => m.date === dateStr);
          const isToday = dateStr === today;
          const isSelected = selectedDay === dateStr;
          const dayCalories = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

          return (
            <div key={dateStr}>
              <button
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`w-full rounded-xl p-3 text-left transition-colors ${
                  isToday
                    ? "bg-primary-50 border-2 border-primary-500"
                    : "bg-white border border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                        isToday
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    <div>
                      <p className={`text-sm font-medium capitalize ${isToday ? "text-primary-700" : "text-gray-900"}`}>
                        {format(day, "EEEE", { locale: fr })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dayMeals.length} repas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame size={14} className="text-orange-500" />
                    <span className="text-sm font-medium text-orange-600">
                      {Math.round(dayCalories)} kcal
                    </span>
                  </div>
                </div>

                {/* Meal type pills */}
                {dayMeals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dayMeals.map((meal) => {
                      const type = MEAL_TYPES.find((t) => t.value === meal.meal_type);
                      return (
                        <span
                          key={meal.id}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${type?.color || "bg-gray-100 text-gray-600"}`}
                        >
                          {meal.recipe_name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>

              {/* Expanded day detail */}
              {isSelected && dayMeals.length > 0 && (
                <div className="mt-1 space-y-2 pl-2">
                  {dayMeals.map((meal) => {
                    const type = MEAL_TYPES.find((t) => t.value === meal.meal_type);
                    return (
                      <div
                        key={meal.id}
                        className="bg-white rounded-lg p-3 flex items-center justify-between border border-gray-100"
                      >
                        <div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${type?.color || "bg-gray-100 text-gray-600"}`}
                          >
                            {type?.label || meal.meal_type}
                          </span>
                          <p className="font-medium text-sm text-gray-900 mt-1">{meal.recipe_name}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs text-gray-500">
                              {meal.calories} kcal
                            </span>
                            {meal.prep_time && (
                              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                <Clock size={10} /> {(meal.prep_time || 0) + (meal.cook_time || 0)} min
                              </span>
                            )}
                            <span className="text-xs text-gray-500 flex items-center gap-0.5">
                              <Users size={10} /> {meal.servings}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMeal(meal.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
