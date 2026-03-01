"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Dumbbell,
  Trash2,
  GripVertical,
  Save,
  Play,
  Clock,
  X,
  Search,
  Check
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { apiUrl } from "@/lib/api";

interface RoutineExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  exercise_description: string;
  muscle_group: string;
  equipment_names: string[];
  position: number;
  sets: number;
  reps: number;
  weight: number;
  rest_time: number;
  notes: string;
}

interface Routine {
  id: number;
  name: string;
  description: string;
  days_of_week: number[];
  is_active: boolean;
  exercises: RoutineExercise[];
}

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  equipment_names: string[];
}

const dayLabels = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function RoutineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routineId = params.id as string;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

  const loadRoutine = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/routines/${routineId}`));
      if (!res.ok) {
        router.push("/sport/routines");
        return;
      }
      const data = await res.json();
      setRoutine(data);
      setName(data.name);
      setDescription(data.description || "");
      setDaysOfWeek(data.days_of_week || []);
    } catch (err) {
      console.error("Failed to load routine:", err);
    } finally {
      setLoading(false);
    }
  }, [routineId, router]);

  const loadExercises = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(apiUrl(`/api/exercises?${params.toString()}`));
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load exercises:", err);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  useEffect(() => {
    if (showAddExercise) {
      const timer = setTimeout(() => {
        loadExercises();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showAddExercise, loadExercises, searchQuery]);

  const saveRoutine = async () => {
    if (!routine) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/api/routines/${routineId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          days_of_week: daysOfWeek,
        }),
      });
      setEditingName(false);
    } catch (err) {
      console.error("Failed to save routine:", err);
    } finally {
      setSaving(false);
    }
  };

  const addExercise = async (exerciseId: number) => {
    try {
      await fetch(apiUrl(`/api/routines/${routineId}/exercises`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise_id: exerciseId }),
      });
      loadRoutine();
      setShowAddExercise(false);
      setSearchQuery("");
    } catch (err) {
      console.error("Failed to add exercise:", err);
    }
  };

  const updateExercise = async (exerciseId: number, updates: Partial<RoutineExercise>) => {
    try {
      await fetch(apiUrl(`/api/routines/${routineId}/exercises/${exerciseId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Failed to update exercise:", err);
    }
  };

  const removeExercise = async (exerciseId: number) => {
    try {
      await fetch(apiUrl(`/api/routines/${routineId}/exercises/${exerciseId}`), {
        method: "DELETE",
      });
      loadRoutine();
    } catch (err) {
      console.error("Failed to remove exercise:", err);
    }
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const startWorkout = async () => {
    try {
      const res = await fetch(apiUrl("/api/workout-logs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routine_id: routineId,
          date: format(new Date(), "yyyy-MM-dd"),
        }),
      });
      if (res.ok) {
        const log = await res.json();
        router.push(`/sport/entrainement/${log.id}`);
      }
    } catch (err) {
      console.error("Failed to start workout:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!routine) {
    return null;
  }

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-gray-900 pb-32">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-card">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/sport/routines"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <button
              onClick={startWorkout}
              className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary-600 transition-all"
            >
              <Play size={16} fill="currentColor" />
              Commencer
            </button>
          </div>

          {/* Name & Description */}
          {editingName ? (
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xl font-bold bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2 border-0 outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white"
                placeholder="Nom de la routine"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2 border-0 outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white resize-none"
                placeholder="Description (optionnel)"
                rows={2}
              />

              {/* Days selection */}
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Jours de la semaine
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                        daysOfWeek.includes(day)
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {dayLabels[day]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setName(routine.name);
                    setDescription(routine.description || "");
                    setDaysOfWeek(routine.days_of_week || []);
                    setEditingName(false);
                  }}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={saveRoutine}
                  disabled={saving}
                  className="flex-1 py-2 bg-primary-500 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save size={16} /> Sauvegarder
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-left w-full"
            >
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {routine.name}
              </h1>
              {routine.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {routine.description}
                </p>
              )}
              {routine.days_of_week?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div
                      key={day}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${
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
            </button>
          )}
        </div>
      </div>

      {/* Exercises */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Exercices ({routine.exercises?.length || 0})
          </h2>
          <button
            onClick={() => setShowAddExercise(true)}
            className="flex items-center gap-1 text-primary-500 text-sm font-semibold"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {routine.exercises?.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-card">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Dumbbell size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Aucun exercice dans cette routine
            </p>
            <button
              onClick={() => setShowAddExercise(true)}
              className="mt-3 text-primary-500 font-semibold text-sm"
            >
              Ajouter un exercice
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {routine.exercises.map((ex, index) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                index={index + 1}
                onUpdate={(updates) => updateExercise(ex.id, updates)}
                onRemove={() => removeExercise(ex.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg dark:text-white">Ajouter un exercice</h3>
                <button
                  onClick={() => {
                    setShowAddExercise(false);
                    setSearchQuery("");
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="relative mt-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm border-0 outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {exercises.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Aucun exercice trouvé
                </p>
              ) : (
                <div className="space-y-2">
                  {exercises.map((ex) => {
                    const alreadyAdded = routine.exercises.some(
                      re => re.exercise_id === ex.id
                    );
                    return (
                      <button
                        key={ex.id}
                        onClick={() => !alreadyAdded && addExercise(ex.id)}
                        disabled={alreadyAdded}
                        className={`w-full p-3 rounded-xl text-left flex items-center justify-between ${
                          alreadyAdded
                            ? "bg-gray-50 dark:bg-gray-700/50 opacity-50"
                            : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {ex.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ex.muscle_group}
                          </p>
                        </div>
                        {alreadyAdded ? (
                          <Check size={18} className="text-green-500" />
                        ) : (
                          <Plus size={18} className="text-primary-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  onUpdate,
  onRemove
}: {
  exercise: RoutineExercise;
  index: number;
  onUpdate: (updates: Partial<RoutineExercise>) => void;
  onRemove: () => void;
}) {
  const [sets, setSets] = useState(exercise.sets);
  const [reps, setReps] = useState(exercise.reps);
  const [weight, setWeight] = useState(exercise.weight);
  const [restTime, setRestTime] = useState(exercise.rest_time);

  const handleBlur = () => {
    if (
      sets !== exercise.sets ||
      reps !== exercise.reps ||
      weight !== exercise.weight ||
      restTime !== exercise.rest_time
    ) {
      onUpdate({ sets, reps, weight, rest_time: restTime });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-500">
            {index}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {exercise.exercise_name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {exercise.muscle_group}
            </p>
          </div>
          <button
            onClick={onRemove}
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Sets, Reps, Weight, Rest */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              Séries
            </label>
            <input
              type="number"
              value={sets}
              onChange={(e) => setSets(parseInt(e.target.value) || 0)}
              onBlur={handleBlur}
              className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-center text-sm font-semibold border-0 outline-none dark:text-white"
              min="1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              Reps
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(parseInt(e.target.value) || 0)}
              onBlur={handleBlur}
              className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-center text-sm font-semibold border-0 outline-none dark:text-white"
              min="1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              Kg
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              onBlur={handleBlur}
              className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-center text-sm font-semibold border-0 outline-none dark:text-white"
              min="0"
              step="0.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium flex items-center gap-1">
              <Clock size={10} /> Repos
            </label>
            <input
              type="number"
              value={restTime}
              onChange={(e) => setRestTime(parseInt(e.target.value) || 0)}
              onBlur={handleBlur}
              className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-center text-sm font-semibold border-0 outline-none dark:text-white"
              min="0"
              step="15"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-center">
          {sets} × {reps} @ {weight}kg • {restTime}s repos
        </div>
      </div>
    </div>
  );
}
