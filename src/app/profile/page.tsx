"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User, TrendingUp, Plus, Save, ChevronDown, ChevronUp,
  Flame, Beef, Wheat, Droplet,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

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
  const [user, setUser] = useState<UserData | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [form, setForm] = useState<Partial<UserData>>({});

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/api/users")).then((r) => r.json()),
      fetch(apiUrl("/api/daily-logs?days=30")).then((r) => r.json()),
    ]).then(([userData, logsData]) => {
      setUser(userData);
      setForm(userData);
      setLogs(logsData);
    });
  }, []);

  const saveProfile = async () => {
    const res = await fetch(apiUrl("/api/users"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setUser(data);
    setEditing(false);
  };

  const avgCalories = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.calories, 0) / logs.length)
    : 0;
  const avgProtein = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.protein, 0) / logs.length)
    : 0;
  const avgCarbs = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.carbs, 0) / logs.length)
    : 0;
  const avgFat = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.fat, 0) / logs.length)
    : 0;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {user.first_name} {user.last_name}
            </h1>
            <p className="text-primary-200 text-sm">{user.email}</p>
          </div>
        </div>
      </div>

      {/* User details */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Informations personnelles</h2>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400"
            >
              {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showDetails && (
            <div className="space-y-3">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Prénom</label>
                      <input
                        type="text"
                        value={form.first_name || ""}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Nom</label>
                      <input
                        type="text"
                        value={form.last_name || ""}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Âge</label>
                      <input
                        type="number"
                        value={form.age || ""}
                        onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || null })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Poids (kg)</label>
                      <input
                        type="number"
                        value={form.weight || ""}
                        onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || null })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Taille (cm)</label>
                      <input
                        type="number"
                        value={form.height || ""}
                        onChange={(e) => setForm({ ...form, height: parseFloat(e.target.value) || null })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Genre</label>
                      <select
                        value={form.gender || ""}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">-</option>
                        <option value="homme">Homme</option>
                        <option value="femme">Femme</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Activité</label>
                      <select
                        value={form.activity_level || ""}
                        onChange={(e) => setForm({ ...form, activity_level: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">-</option>
                        <option value="sedentaire">Sédentaire</option>
                        <option value="leger">Léger</option>
                        <option value="modere">Modéré</option>
                        <option value="actif">Actif</option>
                        <option value="tres_actif">Très actif</option>
                      </select>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">Objectifs journaliers</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Calories (kcal)</label>
                        <input
                          type="number"
                          value={form.daily_calorie_goal || ""}
                          onChange={(e) => setForm({ ...form, daily_calorie_goal: parseInt(e.target.value) || 2000 })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Protéines (g)</label>
                        <input
                          type="number"
                          value={form.daily_protein_goal || ""}
                          onChange={(e) => setForm({ ...form, daily_protein_goal: parseFloat(e.target.value) || 50 })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Glucides (g)</label>
                        <input
                          type="number"
                          value={form.daily_carbs_goal || ""}
                          onChange={(e) => setForm({ ...form, daily_carbs_goal: parseFloat(e.target.value) || 250 })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Lipides (g)</label>
                        <input
                          type="number"
                          value={form.daily_fat_goal || ""}
                          onChange={(e) => setForm({ ...form, daily_fat_goal: parseFloat(e.target.value) || 70 })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={saveProfile}
                    className="w-full bg-primary-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Enregistrer
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900">{user.age || "-"}</p>
                      <p className="text-xs text-gray-500">ans</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900">{user.weight || "-"}</p>
                      <p className="text-xs text-gray-500">kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900">{user.height || "-"}</p>
                      <p className="text-xs text-gray-500">cm</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Genre : </span>
                      <span className="font-medium capitalize">{user.gender || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Activité : </span>
                      <span className="font-medium capitalize">{user.activity_level?.replace("_", " ") || "-"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium"
                  >
                    Modifier
                  </button>
                </>
              )}
            </div>
          )}

          {!showDetails && (
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-bold">{user.age || "-"} <span className="text-xs font-normal text-gray-500">ans</span></p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-bold">{user.weight || "-"} <span className="text-xs font-normal text-gray-500">kg</span></p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                <p className="font-bold">{user.height || "-"} <span className="text-xs font-normal text-gray-500">cm</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nutritional tracking 30 days */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary-600" />
            <h2 className="font-bold text-gray-900">Suivi nutritionnel (30 jours)</h2>
          </div>

          {/* Average stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-orange-50 rounded-lg p-3 flex items-center gap-3">
              <Flame size={20} className="text-orange-500" />
              <div>
                <p className="text-lg font-bold text-orange-600">{avgCalories}</p>
                <p className="text-xs text-orange-400">kcal / jour</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 flex items-center gap-3">
              <Beef size={20} className="text-red-500" />
              <div>
                <p className="text-lg font-bold text-red-600">{avgProtein}g</p>
                <p className="text-xs text-red-400">protéines / jour</p>
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-3">
              <Wheat size={20} className="text-amber-500" />
              <div>
                <p className="text-lg font-bold text-amber-600">{avgCarbs}g</p>
                <p className="text-xs text-amber-400">glucides / jour</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
              <Droplet size={20} className="text-blue-500" />
              <div>
                <p className="text-lg font-bold text-blue-600">{avgFat}g</p>
                <p className="text-xs text-blue-400">lipides / jour</p>
              </div>
            </div>
          </div>

          {/* Mini chart - bar chart of last 14 days */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Calories des 14 derniers jours</p>
            <div className="flex items-end gap-1 h-24">
              {logs.slice(0, 14).reverse().map((log, i) => {
                const maxCal = user.daily_calorie_goal * 1.2;
                const height = Math.min((log.calories / maxCal) * 100, 100);
                const isOver = log.calories > user.daily_calorie_goal;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t ${isOver ? "bg-red-400" : "bg-primary-400"}`}
                      style={{ height: `${height}%` }}
                    />
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

      {/* Create recipe button */}
      <div className="px-4 mt-4">
        <button
          onClick={() => router.push("/creation-recette")}
          className="w-full bg-primary-500 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-colors"
        >
          <Plus size={20} />
          Créer une recette
        </button>
      </div>
    </div>
  );
}
