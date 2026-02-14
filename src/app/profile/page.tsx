"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User, TrendingUp, Plus, Save, ChevronDown, ChevronUp,
  Flame, Beef, Wheat, Droplet, Moon, Sun, Download, Upload, LogOut,
  Calculator, RefreshCw,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ACTIVITY_LEVELS,
  SPORT_TYPES,
  calculateNutrition,
  getSportTypeLabel,
  getActivityLevelLabel,
  type Gender,
  type ActivityLevel,
  type SportType,
} from "@/lib/nutrition";

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  gender: string | null;
  activity_level: string | null;
  sport_type: string | null;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  daily_carbs_goal: number;
  daily_fat_goal: number;
}

interface DailyLog {
  id: number;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [form, setForm] = useState<Partial<UserData>>({});
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/api/users")).then((r) => r.json()),
      fetch(apiUrl("/api/daily-logs?days=30")).then((r) => r.json()),
    ]).then(([userData, logsData]) => {
      setUser(userData);
      setForm(userData);
      setLogs(Array.isArray(logsData) ? logsData : []);
    }).catch(() => {});
  }, []);

  const canRecalculate = form.age && form.weight && form.height && form.gender && form.activity_level;

  const recalculateGoals = () => {
    if (!canRecalculate) return;

    setRecalculating(true);
    const result = calculateNutrition({
      age: Number(form.age),
      weight: Number(form.weight),
      height: Number(form.height),
      gender: form.gender as Gender,
      activityLevel: form.activity_level as ActivityLevel,
      sportType: (form.sport_type as SportType) || "aucun",
    });

    setForm({
      ...form,
      daily_calorie_goal: result.dailyCalories,
      daily_protein_goal: result.dailyProtein,
      daily_carbs_goal: result.dailyCarbs,
      daily_fat_goal: result.dailyFat,
    });

    setTimeout(() => setRecalculating(false), 500);
  };

  const saveProfile = async () => {
    try {
      const res = await fetch(apiUrl("/api/users"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setUser(data);
      setEditing(false);
    } catch {}
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(apiUrl("/api/export?type=all"));
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `todocook-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await fetch(apiUrl("/api/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      alert("Import terminé !");
    } catch {
      alert("Erreur lors de l'import");
    }
    setImporting(false);
  };

  const handleLogout = async () => {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
    router.push("/login");
  };

  const avgCalories = logs.length ? Math.round(logs.reduce((s, l) => s + l.calories, 0) / logs.length) : 0;
  const avgProtein = logs.length ? Math.round(logs.reduce((s, l) => s + l.protein, 0) / logs.length) : 0;
  const avgCarbs = logs.length ? Math.round(logs.reduce((s, l) => s + l.carbs, 0) / logs.length) : 0;
  const avgFat = logs.length ? Math.round(logs.reduce((s, l) => s + l.fat, 0) / logs.length) : 0;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400 dark:text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-primary-600 dark:bg-primary-800 px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{user.first_name} {user.last_name}</h1>
            <p className="text-primary-200 text-sm">{user.email}</p>
          </div>
          <button onClick={toggleTheme} className="p-2 bg-white/20 rounded-full">
            {theme === "dark" ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-white" />}
          </button>
        </div>
      </div>

      {/* User details */}
      <div className="px-4 -mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-white">Informations personnelles</h2>
            <button onClick={() => setShowDetails(!showDetails)} className="text-gray-400">
              {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showDetails && (
            <div className="space-y-3">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Prénom</label>
                      <input type="text" value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Nom</label>
                      <input type="text" value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Âge</label>
                      <input type="number" value={form.age || ""} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || null })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Poids (kg)</label>
                      <input type="number" value={form.weight || ""} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || null })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Taille (cm)</label>
                      <input type="number" value={form.height || ""} onChange={(e) => setForm({ ...form, height: parseFloat(e.target.value) || null })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Genre</label>
                      <select value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                        <option value="">-</option>
                        <option value="homme">Homme</option>
                        <option value="femme">Femme</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Activité</label>
                      <select value={form.activity_level || ""} onChange={(e) => setForm({ ...form, activity_level: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                        <option value="">-</option>
                        {ACTIVITY_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Sport pratiqué</label>
                    <select value={form.sport_type || "aucun"} onChange={(e) => setForm({ ...form, sport_type: e.target.value })}
                      className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                      {SPORT_TYPES.map((sport) => (
                        <option key={sport.value} value={sport.value}>{sport.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nutritional Goals Section */}
                  <div className="border-t dark:border-gray-700 pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Objectifs journaliers</p>
                      <button
                        type="button"
                        onClick={recalculateGoals}
                        disabled={!canRecalculate || recalculating}
                        className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={12} className={recalculating ? "animate-spin" : ""} />
                        Recalculer
                      </button>
                    </div>
                    {canRecalculate && (
                      <p className="text-[10px] text-gray-400 mb-2">
                        Basé sur vos infos : formule Mifflin-St Jeor
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Calories (kcal)</label>
                        <input type="number" value={form.daily_calorie_goal || ""} onChange={(e) => setForm({ ...form, daily_calorie_goal: parseInt(e.target.value) || 2000 })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Protéines (g)</label>
                        <input type="number" value={form.daily_protein_goal || ""} onChange={(e) => setForm({ ...form, daily_protein_goal: parseFloat(e.target.value) || 50 })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Glucides (g)</label>
                        <input type="number" value={form.daily_carbs_goal || ""} onChange={(e) => setForm({ ...form, daily_carbs_goal: parseFloat(e.target.value) || 250 })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Lipides (g)</label>
                        <input type="number" value={form.daily_fat_goal || ""} onChange={(e) => setForm({ ...form, daily_fat_goal: parseFloat(e.target.value) || 70 })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                  <button onClick={saveProfile}
                    className="w-full bg-primary-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Save size={16} /> Enregistrer
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{user.age || "-"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ans</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{user.weight || "-"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">kg</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{user.height || "-"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">cm</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">Genre : </span><span className="font-medium capitalize dark:text-white">{user.gender || "-"}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">Activité : </span><span className="font-medium capitalize dark:text-white">{user.activity_level ? getActivityLevelLabel(user.activity_level as ActivityLevel).split(" (")[0] : "-"}</span></div>
                  </div>
                  {user.sport_type && user.sport_type !== "aucun" && (
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Sport : </span>
                      <span className="font-medium dark:text-white">{getSportTypeLabel(user.sport_type as SportType)}</span>
                    </div>
                  )}

                  {/* Display nutritional goals */}
                  <div className="border-t dark:border-gray-700 pt-3 mt-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Objectifs journaliers</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{user.daily_calorie_goal}</p>
                        <p className="text-[10px] text-orange-400">kcal</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{user.daily_protein_goal}g</p>
                        <p className="text-[10px] text-red-400">prot.</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{user.daily_carbs_goal}g</p>
                        <p className="text-[10px] text-amber-400">gluc.</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{user.daily_fat_goal}g</p>
                        <p className="text-[10px] text-blue-400">lip.</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setEditing(true)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium">Modifier</button>
                </>
              )}
            </div>
          )}

          {!showDetails && (
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                <p className="font-bold dark:text-white">{user.age || "-"} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">ans</span></p>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                <p className="font-bold dark:text-white">{user.weight || "-"} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">kg</span></p>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                <p className="font-bold dark:text-white">{user.height || "-"} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">cm</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nutritional tracking */}
      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary-600 dark:text-primary-400" />
            <h2 className="font-bold text-gray-900 dark:text-white">Suivi nutritionnel (30 jours)</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 flex items-center gap-3">
              <Flame size={20} className="text-orange-500" />
              <div><p className="text-lg font-bold text-orange-600 dark:text-orange-400">{avgCalories}</p><p className="text-xs text-orange-400">kcal / jour</p></div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 flex items-center gap-3">
              <Beef size={20} className="text-red-500" />
              <div><p className="text-lg font-bold text-red-600 dark:text-red-400">{avgProtein}g</p><p className="text-xs text-red-400">protéines / jour</p></div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 flex items-center gap-3">
              <Wheat size={20} className="text-amber-500" />
              <div><p className="text-lg font-bold text-amber-600 dark:text-amber-400">{avgCarbs}g</p><p className="text-xs text-amber-400">glucides / jour</p></div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center gap-3">
              <Droplet size={20} className="text-blue-500" />
              <div><p className="text-lg font-bold text-blue-600 dark:text-blue-400">{avgFat}g</p><p className="text-xs text-blue-400">lipides / jour</p></div>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Calories des 14 derniers jours</p>
            <div className="flex items-end gap-1 h-24">
              {logs.slice(0, 14).reverse().map((log, i) => {
                const maxCal = (user?.daily_calorie_goal || 2000) * 1.2;
                const height = Math.min((log.calories / maxCal) * 100, 100);
                const isOver = log.calories > (user?.daily_calorie_goal || 2000);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className={`w-full rounded-t ${isOver ? "bg-red-400" : "bg-primary-400"}`} style={{ height: `${height}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-gray-400">il y a 14j</span>
              <span className="text-[9px] text-gray-400">aujourd&apos;hui</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 mt-4 space-y-3">
        <button onClick={() => router.push("/creation-recette")}
          className="w-full bg-primary-500 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-colors">
          <Plus size={20} /> Créer une recette
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleExport} disabled={exporting}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm">
            <Download size={16} /> {exporting ? "Export..." : "Exporter"}
          </button>
          <label className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm cursor-pointer">
            <Upload size={16} /> {importing ? "Import..." : "Importer"}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        <button onClick={handleLogout}
          className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2 border border-red-200 dark:border-red-800">
          <LogOut size={18} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
