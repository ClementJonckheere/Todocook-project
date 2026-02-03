"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, X, Flame } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl } from "@/lib/api";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  daily_calorie_goal: number;
}

interface Recipe {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time: number;
  ingredient_names: string;
}

interface MealPlan {
  id: number;
  recipe_id: number;
  recipe_name: string;
  date: string;
  meal_type: string;
  calories: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedMealType, setSelectedMealType] = useState("dejeuner");
  const [todayMeals, setTodayMeals] = useState<MealPlan[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const today = format(new Date(), "yyyy-MM-dd");

  const loadTodayData = useCallback(async () => {
    const [userRes, mealsRes] = await Promise.all([
      fetch(apiUrl("/api/users")),
      fetch(apiUrl(`/api/meal-plans?userId=1&startDate=${today}&endDate=${today}`)),
    ]);
    const userData = await userRes.json();
    const mealsData = await mealsRes.json();
    setUser(userData);
    setTodayMeals(mealsData);
    setTodayCalories(
      mealsData.reduce((sum: number, m: MealPlan) => sum + (m.calories || 0), 0)
    );
  }, [today]);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        const res = await fetch(apiUrl(`/api/recipes?search=${encodeURIComponent(searchQuery)}`));
        const data = await res.json();
        setSearchResults(data);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const addRecipeToDay = async (recipeId: number, date: string, mealType: string) => {
    await fetch(apiUrl("/api/meal-plans"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: 1,
        recipe_id: recipeId,
        date,
        meal_type: mealType,
      }),
    });
    setSelectedRecipe(null);
    setShowCalendar(false);
    setSearchQuery("");
    setShowSearch(false);
    loadTodayData();
  };

  const removeMeal = async (id: number) => {
    await fetch(apiUrl(`/api/meal-plans?id=${id}`), { method: "DELETE" });
    loadTodayData();
  };

  const caloriePercentage = user
    ? Math.min((todayCalories / user.daily_calorie_goal) * 100, 100)
    : 0;

  // Calendar generation
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Fill empty days before the first day of the month
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) days.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Bonjour,</p>
            <h1 className="text-xl font-bold text-gray-900">
              {user ? `${user.first_name} ${user.last_name}` : "..."}
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-xl">
            <Flame size={20} className="text-orange-500" />
            <div className="text-right">
              <p className="text-lg font-bold text-orange-600">{Math.round(todayCalories)}</p>
              <p className="text-[10px] text-orange-400">/ {user?.daily_calorie_goal || 2000} kcal</p>
            </div>
          </div>
        </div>

        {/* Calorie progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                caloriePercentage > 90 ? "bg-red-500" : caloriePercentage > 70 ? "bg-orange-500" : "bg-primary-500"
              }`}
              style={{ width: `${caloriePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearch(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search results */}
        {showSearch && searchResults.length > 0 && (
          <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => {
                  setSelectedRecipe(recipe);
                  setShowCalendar(true);
                  setShowSearch(false);
                }}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="text-left">
                  <p className="font-medium text-sm text-gray-900">{recipe.name}</p>
                  <p className="text-xs text-gray-500">{recipe.calories} kcal</p>
                </div>
                <Plus size={18} className="text-primary-500" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar modal for adding recipe */}
      {showCalendar && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-4 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Ajouter "{selectedRecipe.name}"</h3>
              <button
                onClick={() => {
                  setShowCalendar(false);
                  setSelectedRecipe(null);
                }}
                className="text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                className="p-1"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium capitalize">
                {format(calendarMonth, "MMMM yyyy", { locale: fr })}
              </span>
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                className="p-1"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(calendarMonth).map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      isSelected
                        ? "bg-primary-500 text-white"
                        : isToday
                          ? "bg-primary-100 text-primary-700"
                          : "hover:bg-gray-100"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Meal type selection */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Type de repas :</p>
              <div className="flex gap-2">
                {[
                  { value: "petit-dejeuner", label: "Petit-déj" },
                  { value: "dejeuner", label: "Déjeuner" },
                  { value: "diner", label: "Dîner" },
                  { value: "collation", label: "Collation" },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedMealType(type.value)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedMealType === type.value
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => addRecipeToDay(selectedRecipe.id, selectedDate, selectedMealType)}
              className="w-full mt-4 bg-primary-500 text-white py-3 rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              Ajouter pour le {format(new Date(selectedDate + "T00:00:00"), "d MMMM", { locale: fr })}
            </button>
          </div>
        </div>
      )}

      {/* Today's meals */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Repas du jour
        </h2>
        {todayMeals.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center">
            <p className="text-gray-500 text-sm">Aucun repas prévu pour aujourd&apos;hui</p>
            <p className="text-gray-400 text-xs mt-1">Utilisez la barre de recherche pour ajouter une recette</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayMeals.map((meal) => (
              <div
                key={meal.id}
                className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="text-xs text-primary-600 font-medium capitalize">
                    {meal.meal_type.replace("-", " ")}
                  </p>
                  <p className="font-medium text-gray-900 text-sm">{meal.recipe_name}</p>
                  <p className="text-xs text-gray-500">{meal.calories} kcal</p>
                </div>
                <button
                  onClick={() => removeMeal(meal.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick week overview */}
      <div className="px-4 mt-6 mb-24">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Cette semaine</h2>
        <WeekOverview />
      </div>
    </div>
  );
}

function WeekOverview() {
  const [weekMeals, setWeekMeals] = useState<MealPlan[]>([]);
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    const start = format(monday, "yyyy-MM-dd");
    const end = format(addDays(monday, 6), "yyyy-MM-dd");
    fetch(apiUrl(`/api/meal-plans?userId=1&startDate=${start}&endDate=${end}`))
      .then((r) => r.json())
      .then(setWeekMeals);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayMeals = weekMeals.filter((m) => m.date === dateStr);
        const isToday = dateStr === today;
        return (
          <div
            key={dateStr}
            className={`min-w-[100px] rounded-xl p-3 text-center flex-shrink-0 ${
              isToday ? "bg-primary-50 border-2 border-primary-500" : "bg-white"
            }`}
          >
            <p className="text-xs font-medium text-gray-500 capitalize">
              {format(day, "EEE", { locale: fr })}
            </p>
            <p className={`text-lg font-bold ${isToday ? "text-primary-600" : "text-gray-900"}`}>
              {format(day, "d")}
            </p>
            <p className="text-xs text-gray-500 mt-1">{dayMeals.length} repas</p>
            <p className="text-[10px] text-orange-500 font-medium">
              {dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0)} kcal
            </p>
          </div>
        );
      })}
    </div>
  );
}
