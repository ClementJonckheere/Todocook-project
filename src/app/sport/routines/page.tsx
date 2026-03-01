"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Dumbbell,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  Play,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

interface Routine {
  id: number;
  name: string;
  description: string;
  exercise_count: number;
  total_sets: number;
  is_active: boolean;
  days_of_week: number[];
}

const dayLabels = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const loadRoutines = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/routines"));
      const data = await res.json();
      setRoutines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load routines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const deleteRoutine = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette routine ?")) return;

    try {
      const res = await fetch(apiUrl(`/api/routines/${id}`), { method: "DELETE" });
      if (res.ok) {
        setRoutines(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete routine:", err);
    }
    setMenuOpen(null);
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch(apiUrl(`/api/routines/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setRoutines(prev => prev.map(r =>
          r.id === id ? { ...r, is_active: !currentActive } : r
        ));
      }
    } catch (err) {
      console.error("Failed to toggle active:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-card">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/sport"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
              </Link>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Mes routines
              </h1>
            </div>
            <Link
              href="/sport/routines/nouvelle"
              className="p-2.5 bg-primary-500 rounded-xl shadow-card hover:bg-primary-600 transition-all"
            >
              <Plus size={20} className="text-white" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {routines.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Dumbbell size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Aucune routine créée
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-4">
              Créez votre première routine d&apos;entraînement
            </p>
            <Link
              href="/sport/routines/nouvelle"
              className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-all"
            >
              <Plus size={18} />
              Créer une routine
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <Link
                      href={`/sport/routines/${routine.id}`}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          routine.is_active
                            ? "bg-primary-50 dark:bg-primary-900/30"
                            : "bg-gray-100 dark:bg-gray-700"
                        }`}>
                          <Dumbbell size={22} className={
                            routine.is_active ? "text-primary-500" : "text-gray-400"
                          } />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {routine.name}
                          </h3>
                          {routine.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                              {routine.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                            <span>{routine.exercise_count} exercices</span>
                            <span>{routine.total_sets} séries</span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === routine.id ? null : routine.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>

                      {menuOpen === routine.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpen(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 rounded-xl shadow-float z-50 py-1 min-w-[160px]">
                            <Link
                              href={`/sport/routines/${routine.id}`}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                              <Edit2 size={16} /> Modifier
                            </Link>
                            <button
                              onClick={() => toggleActive(routine.id, routine.is_active)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                              <Play size={16} />
                              {routine.is_active ? "Désactiver" : "Activer"}
                            </button>
                            <button
                              onClick={() => deleteRoutine(routine.id)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={16} /> Supprimer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Days of week */}
                  {routine.days_of_week?.length > 0 && (
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <Calendar size={14} className="text-gray-400 mr-1" />
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <div
                          key={day}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium ${
                            routine.days_of_week.includes(day)
                              ? "bg-primary-500 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                          }`}
                        >
                          {dayLabels[day]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
