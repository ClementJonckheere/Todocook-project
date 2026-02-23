"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, X, Flame, Heart, Star, ClipboardList, BookOpen, Sparkles, ShoppingCart } from "lucide-react";
import Link from "next/link";
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
  avg_rating: number;
  is_favorite: boolean;
}

interface MealPlan {
  id: number;
  recipe_id: number;
  recipe_name: string;
  date: string;
  meal_type: string;
  calories: number;
}

const quickActions = [
  { href: "/scanner", icon: Search, label: "Chercher", bg: "bg-primary-50 dark:bg-primary-900/30", color: "text-primary-600 dark:text-primary-400" },
  { href: "/creation-recette", icon: Plus, label: "Créer", bg: "bg-accent-50 dark:bg-accent-900/30", color: "text-accent-600 dark:text-accent-400" },
  { href: "/liste-courses", icon: ShoppingCart, label: "Courses", bg: "bg-amber-50 dark:bg-amber-900/30", color: "text-amber-600 dark:text-amber-400" },
  { href: "/suggestions-recettes", icon: Sparkles, label: "Idées", bg: "bg-purple-50 dark:bg-purple-900/30", color: "text-purple-600 dark:text-purple-400" },
];

const mealTypeConfig: Record<string, { emoji: string; color: string }> = {
  "petit-dejeuner": { emoji: "🌅", color: "text-amber-600" },
  "dejeuner": { emoji: "☀️", color: "text-orange-600" },
  "diner": { emoji: "🌙", color: "text-indigo-600" },
  "collation": { emoji: "🍎", color: "text-green-600" },
};

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
    try {
      const [userRes, mealsRes] = await Promise.all([
        fetch(apiUrl("/api/users")),
        fetch(apiUrl(`/api/meal-plans?startDate=${today}&endDate=${today}`)),
      ]);
      const userData = await userRes.json();
      const mealsData = await mealsRes.json();
      setUser(userData);
      setTodayMeals(Array.isArray(mealsData) ? mealsData : []);
      setTodayCalories(
        (Array.isArray(mealsData) ? mealsData : []).reduce((sum: number, m: MealPlan) => sum + (m.calories || 0), 0)
      );
    } catch (err) {
      console.error("Failed to load today's data:", err);
    }
  }, [today]);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(apiUrl(`/api/recipes?search=${encodeURIComponent(searchQuery)}`));
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch {
          setSearchResults([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const toggleFavorite = async (recipeId: number, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await fetch(apiUrl(`/api/favorites?recipeId=${recipeId}`), { method: "DELETE" });
      } else {
        await fetch(apiUrl("/api/favorites"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe_id: recipeId }),
        });
      }
      setSearchResults((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: !isFavorite } : r))
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const addRecipeToDay = async (recipeId: number, date: string, mealType: string) => {
    try {
      const res = await fetch(apiUrl("/api/meal-plans"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId, date, meal_type: mealType }),
      });
      if (!res.ok) {
        console.error("Failed to add recipe:", await res.text());
      }
    } catch (err) {
      console.error("Failed to add recipe to day:", err);
    }
    setSelectedRecipe(null);
    setShowCalendar(false);
    setSearchQuery("");
    setShowSearch(false);
    loadTodayData();
  };

  const removeMeal = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`/api/meal-plans?id=${id}`), { method: "DELETE" });
      if (!res.ok) {
        console.error("Failed to remove meal:", await res.text());
      }
    } catch (err) {
      console.error("Failed to remove meal:", err);
    }
    loadTodayData();
  };

  const caloriePercentage = user
    ? Math.min((todayCalories / user.daily_calorie_goal) * 100, 100)
    : 0;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bonjour,</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              {user ? user.first_name : "..."}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pense-bete"
              className="p-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all"
              title="Pense-bête courses"
            >
              <ClipboardList size={20} className="text-primary-600 dark:text-primary-400" />
            </Link>
            <Link
              href="/garde-manger"
              className="p-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all"
              title="Garde-manger"
            >
              <BookOpen size={20} className="text-accent-600 dark:text-accent-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Calorie card */}
      <div className="px-4 mt-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <Flame size={16} className="text-orange-500" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Calories aujourd&apos;hui</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(todayCalories)}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">/ {user?.daily_calorie_goal || 2000}</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                caloriePercentage > 90 ? "bg-red-500" : caloriePercentage > 70 ? "bg-orange-500" : "bg-primary-500"
              }`}
              style={{ width: `${caloriePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-5">
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="flex flex-col items-center gap-1.5">
                <div className={`w-14 h-14 rounded-2xl ${action.bg} flex items-center justify-center shadow-card hover:shadow-card-hover transition-all`}>
                  <Icon size={22} className={action.color} />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 mt-5">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-card focus:shadow-card-hover focus:ring-2 focus:ring-primary-500/20 border-0 outline-none text-sm dark:text-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setShowSearch(false); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        {showSearch && searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-float max-h-64 overflow-y-auto">
            {searchResults.map((recipe) => (
              <div key={recipe.id} className="p-3 flex items-center justify-between hover:bg-warm-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-0 first:rounded-t-2xl last:rounded-b-2xl">
                <button
                  onClick={() => { setSelectedRecipe(recipe); setShowCalendar(true); setShowSearch(false); }}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{recipe.name}</p>
                    {recipe.avg_rating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        <Star size={10} fill="currentColor" />{Number(recipe.avg_rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{recipe.calories} kcal</p>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleFavorite(recipe.id, recipe.is_favorite)} className="p-1">
                    <Heart size={16} className={recipe.is_favorite ? "text-red-500 fill-red-500" : "text-gray-300 dark:text-gray-600"} />
                  </button>
                  <button onClick={() => { setSelectedRecipe(recipe); setShowCalendar(true); setShowSearch(false); }} className="p-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                    <Plus size={16} className="text-primary-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar modal */}
      {showCalendar && selectedRecipe && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-5 animate-slide-up">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg dark:text-white">Ajouter &quot;{selectedRecipe.name}&quot;</h3>
              <button onClick={() => { setShowCalendar(false); setSelectedRecipe(null); }} className="p-1 text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft size={20} className="dark:text-white" /></button>
              <span className="font-semibold capitalize dark:text-white">{format(calendarMonth, "MMMM yyyy", { locale: fr })}</span>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronRight size={20} className="dark:text-white" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-1">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (<div key={d} className="font-medium">{d}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(calendarMonth).map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                    className={`p-2 text-sm rounded-xl transition-colors ${isSelected ? "bg-primary-500 text-white font-bold" : isToday ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold" : "hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"}`}>
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type de repas</p>
              <div className="flex gap-2">
                {[{ value: "petit-dejeuner", label: "Petit-déj" }, { value: "dejeuner", label: "Déjeuner" }, { value: "diner", label: "Dîner" }, { value: "collation", label: "Collation" }].map((type) => (
                  <button key={type.value} onClick={() => setSelectedMealType(type.value)}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${selectedMealType === type.value ? "bg-primary-500 text-white shadow-card" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => addRecipeToDay(selectedRecipe.id, selectedDate, selectedMealType)}
              className="w-full mt-5 bg-primary-500 text-white py-3.5 rounded-2xl font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all shadow-card">
              Ajouter pour le {format(new Date(selectedDate + "T00:00:00"), "d MMMM", { locale: fr })}
            </button>
          </div>
        </div>
      )}

      {/* Today's meals */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">Repas du jour</h2>
        {todayMeals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-card">
            <div className="w-12 h-12 bg-warm-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🍽️</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Aucun repas prévu</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Recherchez une recette pour commencer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayMeals.map((meal) => {
              const config = mealTypeConfig[meal.meal_type] || { emoji: "🍴", color: "text-gray-600" };
              return (
                <div key={meal.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 flex items-center justify-between shadow-card hover:shadow-card-hover transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-warm-50 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                      <span className="text-lg">{config.emoji}</span>
                    </div>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${config.color}`}>{meal.meal_type.replace("-", " ")}</p>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{meal.recipe_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{meal.calories} kcal</p>
                    </div>
                  </div>
                  <button onClick={() => removeMeal(meal.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick week overview */}
      <div className="px-4 mt-6 mb-24">
        <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">Cette semaine</h2>
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
    fetch(apiUrl(`/api/meal-plans?startDate=${start}&endDate=${end}`))
      .then((r) => r.json())
      .then((data) => setWeekMeals(Array.isArray(data) ? data : []))
      .catch(() => setWeekMeals([]));
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
          <div key={dateStr}
            className={`min-w-[90px] rounded-2xl p-3 text-center flex-shrink-0 shadow-card transition-all ${isToday ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-800"}`}>
            <p className={`text-xs font-semibold capitalize ${isToday ? "text-primary-100" : "text-gray-400 dark:text-gray-500"}`}>{format(day, "EEE", { locale: fr })}</p>
            <p className={`text-xl font-extrabold mt-0.5 ${isToday ? "text-white" : "text-gray-900 dark:text-white"}`}>{format(day, "d")}</p>
            <div className="flex justify-center gap-0.5 mt-1.5">
              {dayMeals.length > 0 ? (
                dayMeals.slice(0, 3).map((_, idx) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white/70" : "bg-primary-400"}`} />
                ))
              ) : (
                <div className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white/30" : "bg-gray-200 dark:bg-gray-600"}`} />
              )}
            </div>
            <p className={`text-[10px] font-medium mt-1 ${isToday ? "text-primary-100" : "text-gray-400 dark:text-gray-500"}`}>
              {dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0)} kcal
            </p>
          </div>
        );
      })}
    </div>
  );
}
