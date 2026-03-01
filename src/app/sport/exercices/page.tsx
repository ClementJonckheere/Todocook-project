"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Info
} from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscle_group: string;
  secondary_muscles: string[];
  difficulty: string;
  instructions: string;
  rest_time_light: number;
  rest_time_moderate: number;
  rest_time_heavy: number;
  equipment_names: string[];
  equipment_ids: number[];
}

interface Equipment {
  id: number;
  name: string;
  icon: string;
  exercise_count: number;
}

interface MuscleGroup {
  muscle_group: string;
  exercise_count: number;
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  beginner: { label: "Débutant", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  intermediate: { label: "Intermédiaire", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  advanced: { label: "Avancé", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const muscleGroupEmojis: Record<string, string> = {
  "Pectoraux": "💪",
  "Dos": "🔙",
  "Épaules": "🎯",
  "Biceps": "💪",
  "Triceps": "💪",
  "Quadriceps": "🦵",
  "Ischio-jambiers": "🦵",
  "Fessiers": "🍑",
  "Mollets": "🦶",
  "Abdominaux": "🔥",
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<number[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [equipRes, muscleRes] = await Promise.all([
        fetch(apiUrl("/api/equipment")),
        fetch(apiUrl("/api/muscle-groups")),
      ]);

      const equipData = await equipRes.json();
      const muscleData = await muscleRes.json();

      setEquipment(Array.isArray(equipData) ? equipData : []);
      setMuscleGroups(Array.isArray(muscleData) ? muscleData : []);
    } catch (err) {
      console.error("Failed to load filters:", err);
    }
  }, []);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedMuscle) params.append("muscle_group", selectedMuscle);
      if (selectedDifficulty) params.append("difficulty", selectedDifficulty);
      if (selectedEquipment.length > 0) params.append("equipment", selectedEquipment.join(","));

      const res = await fetch(apiUrl(`/api/exercises?${params.toString()}`));
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load exercises:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedMuscle, selectedDifficulty, selectedEquipment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExercises();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadExercises]);

  const toggleEquipment = (id: number) => {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSelectedEquipment([]);
    setSelectedMuscle("");
    setSelectedDifficulty("");
    setSearchQuery("");
  };

  const activeFiltersCount = selectedEquipment.length +
    (selectedMuscle ? 1 : 0) +
    (selectedDifficulty ? 1 : 0);

  // Group exercises by muscle
  const groupedExercises = exercises.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = [];
    acc[ex.muscle_group].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-card sticky top-0 z-40">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/sport"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Exercices
            </h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un exercice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-2xl border-0 outline-none text-sm dark:text-white focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter button */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showFilters || activeFiltersCount > 0
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              <Filter size={16} />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="bg-white text-primary-500 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
            {/* Muscle Groups */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Groupe musculaire
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedMuscle("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    !selectedMuscle
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  Tous
                </button>
                {muscleGroups.map((mg) => (
                  <button
                    key={mg.muscle_group}
                    onClick={() => setSelectedMuscle(mg.muscle_group)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedMuscle === mg.muscle_group
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {muscleGroupEmojis[mg.muscle_group] || "💪"} {mg.muscle_group}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Équipement disponible
              </p>
              <div className="flex flex-wrap gap-2">
                {equipment.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => toggleEquipment(eq.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedEquipment.includes(eq.id)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {eq.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Difficulté
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDifficulty("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    !selectedDifficulty
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  Tous
                </button>
                {Object.entries(difficultyLabels).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDifficulty(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedDifficulty === key
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Dumbbell size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Aucun exercice trouvé
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Essayez de modifier vos filtres
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedExercises).map(([muscleGroup, groupExercises]) => (
              <div key={muscleGroup}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{muscleGroupEmojis[muscleGroup] || "💪"}</span>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                    {muscleGroup}
                  </h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({groupExercises.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {groupExercises.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      expanded={expandedExercise === exercise.id}
                      onToggle={() => setExpandedExercise(
                        expandedExercise === exercise.id ? null : exercise.id
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  expanded,
  onToggle
}: {
  exercise: Exercise;
  expanded: boolean;
  onToggle: () => void;
}) {
  const diff = difficultyLabels[exercise.difficulty] || difficultyLabels.intermediate;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {exercise.name}
            </h3>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${diff.color}`}>
              {diff.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            {exercise.description}
          </p>
          {exercise.equipment_names?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {exercise.equipment_names.map((eq, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full"
                >
                  {eq}
                </span>
              ))}
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400 ml-2 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 ml-2 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className="mt-3 space-y-3">
            {/* Secondary muscles */}
            {exercise.secondary_muscles?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Muscles secondaires
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {exercise.secondary_muscles.join(", ")}
                </p>
              </div>
            )}

            {/* Rest times */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Temps de repos conseillé
              </p>
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Léger</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">
                    {exercise.rest_time_light}s
                  </p>
                </div>
                <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Modéré</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {exercise.rest_time_moderate}s
                  </p>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Lourd</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">
                    {exercise.rest_time_heavy}s
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            {exercise.instructions && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Instructions
                </p>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {exercise.instructions}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
