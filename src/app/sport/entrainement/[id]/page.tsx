"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  Pause,
  Play,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl } from "@/lib/api";

interface RoutineExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  weight: number;
  rest_time: number;
}

interface WorkoutLog {
  id: number;
  routine_id: number;
  routine_name: string;
  date: string;
  completed: boolean;
  duration_minutes: number;
  exercises: RoutineExercise[];
}

interface SetLog {
  exercise_id: number;
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;

  const [workout, setWorkout] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSets, setCompletedSets] = useState<Record<string, SetLog>>({});
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimerRunning, setRestTimerRunning] = useState(false);
  const [startTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadWorkout = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/workout-logs/${workoutId}`));
      if (!res.ok) {
        router.push("/sport/calendrier");
        return;
      }
      const data = await res.json();
      setWorkout(data);

      // If routine, load routine exercises
      if (data.routine_id) {
        const routineRes = await fetch(apiUrl(`/api/routines/${data.routine_id}`));
        const routineData = await routineRes.json();
        setWorkout({ ...data, exercises: routineData.exercises || [] });

        // Set first exercise as expanded
        if (routineData.exercises?.length > 0) {
          setExpandedExercise(routineData.exercises[0].exercise_id);
        }
      }
    } catch (err) {
      console.error("Failed to load workout:", err);
    } finally {
      setLoading(false);
    }
  }, [workoutId, router]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Rest timer
  useEffect(() => {
    if (restTimerRunning && restTimer !== null && restTimer > 0) {
      timerRef.current = setTimeout(() => {
        setRestTimer(restTimer - 1);
      }, 1000);
    } else if (restTimer === 0) {
      // Timer finished - could add sound/vibration here
      setRestTimerRunning(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [restTimer, restTimerRunning]);

  const toggleSet = async (exerciseId: number, setNumber: number, exercise: RoutineExercise) => {
    const key = `${exerciseId}-${setNumber}`;
    const isCompleted = completedSets[key]?.completed;

    if (!isCompleted) {
      // Mark as completed
      const setLog: SetLog = {
        exercise_id: exerciseId,
        set_number: setNumber,
        reps: exercise.reps,
        weight: exercise.weight,
        completed: true,
      };

      setCompletedSets(prev => ({ ...prev, [key]: setLog }));

      // Start rest timer
      setRestTimer(exercise.rest_time);
      setRestTimerRunning(true);

      // Log to server
      try {
        await fetch(apiUrl(`/api/workout-logs/${workoutId}/exercises`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exercise_id: exerciseId,
            set_number: setNumber,
            reps: exercise.reps,
            weight: exercise.weight,
            completed: true,
          }),
        });
      } catch (err) {
        console.error("Failed to log set:", err);
      }
    } else {
      // Unmark
      setCompletedSets(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  const updateSetData = (exerciseId: number, setNumber: number, field: "reps" | "weight", value: number) => {
    const key = `${exerciseId}-${setNumber}`;
    setCompletedSets(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        exercise_id: exerciseId,
        set_number: setNumber,
        [field]: value,
        completed: prev[key]?.completed || false,
      },
    }));
  };

  const finishWorkout = async () => {
    try {
      await fetch(apiUrl(`/api/workout-logs/${workoutId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          duration_minutes: Math.floor(elapsedTime / 60),
        }),
      });
      router.push("/sport");
    } catch (err) {
      console.error("Failed to finish workout:", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCompletedSetsCount = (exerciseId: number, totalSets: number) => {
    let count = 0;
    for (let i = 1; i <= totalSets; i++) {
      if (completedSets[`${exerciseId}-${i}`]?.completed) count++;
    }
    return count;
  };

  const getTotalProgress = () => {
    if (!workout?.exercises) return 0;
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const completedCount = Object.values(completedSets).filter(s => s.completed).length;
    return totalSets > 0 ? Math.round((completedCount / totalSets) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!workout) return null;

  const progress = getTotalProgress();

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-gray-900 pb-32">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-card sticky top-0 z-40">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/sport"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(workout.date + "T00:00:00"), "d MMMM", { locale: fr })}
              </p>
              <p className="font-bold text-gray-900 dark:text-white">
                {workout.routine_name || "Entraînement libre"}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-xl">
              <Clock size={14} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">Progression</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rest Timer */}
      {restTimer !== null && restTimer > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium">Repos</p>
                <p className="text-3xl font-bold">{formatTime(restTimer)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRestTimerRunning(!restTimerRunning)}
                  className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  {restTimerRunning ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                </button>
                <button
                  onClick={() => setRestTimer(null)}
                  className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercises */}
      <div className="px-4 pt-4">
        {workout.exercises?.length > 0 ? (
          <div className="space-y-2">
            {workout.exercises.map((ex, index) => {
              const isExpanded = expandedExercise === ex.exercise_id;
              const completedCount = getCompletedSetsCount(ex.exercise_id, ex.sets);
              const isComplete = completedCount === ex.sets;

              return (
                <div
                  key={ex.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden ${
                    isComplete ? "ring-2 ring-green-500" : ""
                  }`}
                >
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.exercise_id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isComplete
                          ? "bg-green-500"
                          : "bg-primary-50 dark:bg-primary-900/30"
                      }`}>
                        {isComplete ? (
                          <Check size={20} className="text-white" />
                        ) : (
                          <span className="text-sm font-bold text-primary-500">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {ex.exercise_name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {completedCount}/{ex.sets} séries • {ex.muscle_group}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="mt-3 space-y-2">
                        {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNum) => {
                          const key = `${ex.exercise_id}-${setNum}`;
                          const setData = completedSets[key];
                          const isSetComplete = setData?.completed;

                          return (
                            <div
                              key={setNum}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                isSetComplete
                                  ? "bg-green-50 dark:bg-green-900/20"
                                  : "bg-gray-50 dark:bg-gray-700/50"
                              }`}
                            >
                              <button
                                onClick={() => toggleSet(ex.exercise_id, setNum, ex)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                  isSetComplete
                                    ? "bg-green-500 text-white"
                                    : "bg-white dark:bg-gray-600 text-gray-400 border border-gray-200 dark:border-gray-500"
                                }`}
                              >
                                {isSetComplete ? (
                                  <Check size={16} />
                                ) : (
                                  <span className="text-xs font-semibold">{setNum}</span>
                                )}
                              </button>

                              <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                                    Reps
                                  </label>
                                  <input
                                    type="number"
                                    value={setData?.reps ?? ex.reps}
                                    onChange={(e) => updateSetData(ex.exercise_id, setNum, "reps", parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 bg-white dark:bg-gray-600 rounded-lg text-center text-sm font-semibold border-0 outline-none dark:text-white"
                                  />
                                </div>
                                <div className="text-gray-300 dark:text-gray-500">×</div>
                                <div className="flex-1">
                                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                                    Kg
                                  </label>
                                  <input
                                    type="number"
                                    value={setData?.weight ?? ex.weight}
                                    onChange={(e) => updateSetData(ex.exercise_id, setNum, "weight", parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 bg-white dark:bg-gray-600 rounded-lg text-center text-sm font-semibold border-0 outline-none dark:text-white"
                                    step="0.5"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick rest timer */}
                      <div className="mt-3 flex gap-2">
                        {[60, 90, 120].map((seconds) => (
                          <button
                            key={seconds}
                            onClick={() => {
                              setRestTimer(seconds);
                              setRestTimerRunning(true);
                            }}
                            className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                          >
                            <Clock size={12} className="inline mr-1" />
                            {seconds}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-card">
            <p className="text-gray-500 dark:text-gray-400">
              Entraînement libre - pas d&apos;exercices prédéfinis
            </p>
          </div>
        )}
      </div>

      {/* Finish button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-warm-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setShowFinishModal(true)}
          className="w-full py-4 bg-green-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-card"
        >
          <Trophy size={18} />
          Terminer l&apos;entraînement
        </button>
      </div>

      {/* Finish Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Bien joué !
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Entraînement terminé en {formatTime(elapsedTime)}
            </p>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
              <div className="flex justify-around">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Object.values(completedSets).filter(s => s.completed).length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Séries</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {progress}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Complet</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-semibold text-gray-600 dark:text-gray-300"
              >
                Continuer
              </button>
              <button
                onClick={finishWorkout}
                className="flex-1 py-3 bg-green-500 rounded-xl font-semibold text-white"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
