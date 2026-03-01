"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Dumbbell,
  Plus,
  X
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl } from "@/lib/api";

interface WorkoutLog {
  id: number;
  routine_id: number;
  routine_name: string;
  date: string;
  completed: boolean;
  duration_minutes: number;
}

interface Routine {
  id: number;
  name: string;
  days_of_week: number[];
  is_active: boolean;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddWorkout, setShowAddWorkout] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const start = format(startOfMonth(subMonths(currentMonth, 1)), "yyyy-MM-dd");
      const end = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");

      const [logsRes, routinesRes] = await Promise.all([
        fetch(apiUrl(`/api/workout-logs?startDate=${start}&endDate=${end}`)),
        fetch(apiUrl("/api/routines")),
      ]);

      const logsData = await logsRes.json();
      const routinesData = await routinesRes.json();

      setWorkoutLogs(Array.isArray(logsData) ? logsData : []);
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addWorkout = async (routineId: number | null) => {
    if (!selectedDate) return;

    try {
      const res = await fetch(apiUrl("/api/workout-logs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routine_id: routineId,
          date: format(selectedDate, "yyyy-MM-dd"),
        }),
      });

      if (res.ok) {
        const log = await res.json();
        setWorkoutLogs(prev => [...prev, log]);
        setShowAddWorkout(false);
        window.location.href = `/sport/entrainement/${log.id}`;
      }
    } catch (err) {
      console.error("Failed to add workout:", err);
    }
  };

  const deleteWorkout = async (logId: number) => {
    if (!confirm("Supprimer cet entraînement ?")) return;

    try {
      const res = await fetch(apiUrl(`/api/workout-logs/${logId}`), { method: "DELETE" });
      if (res.ok) {
        setWorkoutLogs(prev => prev.filter(l => l.id !== logId));
      }
    } catch (err) {
      console.error("Failed to delete workout:", err);
    }
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getLogsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return workoutLogs.filter(log => log.date === dateStr);
  };

  const getScheduledRoutine = (date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    return routines.find(r => r.is_active && r.days_of_week?.includes(dayOfWeek));
  };

  const today = new Date();
  const selectedDateLogs = selectedDate ? getLogsForDate(selectedDate) : [];
  const selectedDateScheduled = selectedDate ? getScheduledRoutine(selectedDate) : null;

  // Stats
  const thisMonthLogs = workoutLogs.filter(log => {
    const logDate = new Date(log.date + "T00:00:00");
    return isSameMonth(logDate, currentMonth);
  });
  const completedThisMonth = thisMonthLogs.filter(log => log.completed).length;

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
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/sport"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Calendrier
            </h1>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-3">
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {completedThisMonth}
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 font-medium">
                séances ce mois
              </p>
            </div>
            <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {thisMonthLogs.length}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
                entraînements
              </p>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="px-4 pb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const logs = getLogsForDate(date);
              const scheduled = getScheduledRoutine(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const hasCompleted = logs.some(l => l.completed);
              const hasInProgress = logs.some(l => !l.completed);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                    !isCurrentMonth
                      ? "text-gray-300 dark:text-gray-600"
                      : isSelected
                      ? "bg-primary-500 text-white shadow-card"
                      : isToday
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className={`text-sm ${isToday || isSelected ? "font-bold" : ""}`}>
                    {format(date, "d")}
                  </span>

                  {/* Indicators */}
                  <div className="flex gap-0.5 mt-0.5">
                    {hasCompleted && (
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-green-500"
                      }`} />
                    )}
                    {hasInProgress && (
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white/70" : "bg-amber-500"
                      }`} />
                    )}
                    {!logs.length && scheduled && isCurrentMonth && (
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white/50" : "bg-gray-300 dark:bg-gray-600"
                      }`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </h3>
            <button
              onClick={() => setShowAddWorkout(true)}
              className="flex items-center gap-1 text-primary-500 text-sm font-semibold"
            >
              <Plus size={16} /> Ajouter
            </button>
          </div>

          {/* Scheduled routine */}
          {selectedDateScheduled && selectedDateLogs.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-card mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Dumbbell size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Programmé</p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {selectedDateScheduled.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => addWorkout(selectedDateScheduled.id)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all"
                >
                  Commencer
                </button>
              </div>
            </div>
          )}

          {/* Logs */}
          {selectedDateLogs.length > 0 ? (
            <div className="space-y-2">
              {selectedDateLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        log.completed
                          ? "bg-green-50 dark:bg-green-900/30"
                          : "bg-amber-50 dark:bg-amber-900/30"
                      }`}>
                        {log.completed ? (
                          <Check size={18} className="text-green-500" />
                        ) : (
                          <Clock size={18} className="text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {log.routine_name || "Entraînement libre"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {log.completed ? "Terminé" : "En cours"}
                          {log.duration_minutes && ` • ${log.duration_minutes} min`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!log.completed && (
                        <Link
                          href={`/sport/entrainement/${log.id}`}
                          className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Continuer
                        </Link>
                      )}
                      <button
                        onClick={() => deleteWorkout(log.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !selectedDateScheduled && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-card">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Aucun entraînement ce jour
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Workout Modal */}
      {showAddWorkout && selectedDate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-5">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg dark:text-white">
                Ajouter un entraînement
              </h3>
              <button
                onClick={() => setShowAddWorkout(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={22} />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
            </p>

            <div className="space-y-2">
              {/* Free workout */}
              <button
                onClick={() => addWorkout(null)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  Entraînement libre
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sans routine prédéfinie
                </p>
              </button>

              {/* Routines */}
              {routines.filter(r => r.is_active).map((routine) => (
                <button
                  key={routine.id}
                  onClick={() => addWorkout(routine.id)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                >
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {routine.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Routine personnalisée
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
