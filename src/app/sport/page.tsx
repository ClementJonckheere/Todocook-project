"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dumbbell,
  Calendar,
  ListChecks,
  Plus,
  ChevronRight,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Play,
  Check
} from "lucide-react";
import Link from "next/link";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
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

interface WorkoutLog {
  id: number;
  routine_id: number;
  routine_name: string;
  date: string;
  completed: boolean;
  duration_minutes: number;
}

interface User {
  id: number;
  first_name: string;
}

const quickActions = [
  { href: "/sport/exercices", icon: Dumbbell, label: "Exercices", bg: "bg-blue-50 dark:bg-blue-900/30", color: "text-blue-600 dark:text-blue-400" },
  { href: "/sport/routines", icon: ListChecks, label: "Routines", bg: "bg-purple-50 dark:bg-purple-900/30", color: "text-purple-600 dark:text-purple-400" },
  { href: "/sport/calendrier", icon: Calendar, label: "Planning", bg: "bg-green-50 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" },
  { href: "/sport/routines/nouvelle", icon: Plus, label: "Créer", bg: "bg-accent-50 dark:bg-accent-900/30", color: "text-accent-600 dark:text-accent-400" },
];

export default function SportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [weekLogs, setWeekLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");
  const currentDayOfWeek = new Date().getDay();

  const loadData = useCallback(async () => {
    try {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);

      const [userRes, routinesRes, logsRes] = await Promise.all([
        fetch(apiUrl("/api/users")),
        fetch(apiUrl("/api/routines")),
        fetch(apiUrl(`/api/workout-logs?startDate=${format(monday, "yyyy-MM-dd")}&endDate=${format(sunday, "yyyy-MM-dd")}`)),
      ]);

      const userData = await userRes.json();
      const routinesData = await routinesRes.json();
      const logsData = await logsRes.json();

      setUser(userData);
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
      setWeekLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todaysRoutine = routines.find(r =>
    r.is_active && r.days_of_week?.includes(currentDayOfWeek === 0 ? 7 : currentDayOfWeek)
  );

  const todayLog = weekLogs.find(log => log.date === today);
  const completedThisWeek = weekLogs.filter(log => log.completed).length;

  const startWorkout = async (routineId: number) => {
    try {
      const res = await fetch(apiUrl("/api/workout-logs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routine_id: routineId, date: today }),
      });
      if (res.ok) {
        const log = await res.json();
        window.location.href = `/sport/entrainement/${log.id}`;
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

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Musculation</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              {user ? `Salut ${user.first_name}` : "..."}
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="p-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all"
            title="Retour à l'accueil"
          >
            <Flame size={20} className="text-accent-600 dark:text-accent-400" />
          </Link>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="px-4 mt-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                <TrendingUp size={16} className="text-primary-500" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Cette semaine</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{completedThisWeek}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">séances</span>
            </div>
          </div>
          <WeekOverview weekLogs={weekLogs} />
        </div>
      </div>

      {/* Today's Routine */}
      {todaysRoutine && !todayLog && (
        <div className="px-4 mt-5">
          <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
            Séance du jour
          </h2>
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 shadow-card text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium">
                  {format(new Date(), "EEEE d MMMM", { locale: fr })}
                </p>
                <h3 className="text-xl font-bold mt-1">{todaysRoutine.name}</h3>
                <div className="flex items-center gap-4 mt-2 text-primary-100">
                  <span className="flex items-center gap-1 text-sm">
                    <Dumbbell size={14} /> {todaysRoutine.exercise_count} exercices
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Target size={14} /> {todaysRoutine.total_sets} séries
                  </span>
                </div>
              </div>
              <button
                onClick={() => startWorkout(todaysRoutine.id)}
                className="flex items-center gap-2 bg-white text-primary-600 px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:bg-primary-50 transition-all"
              >
                <Play size={18} fill="currentColor" />
                Go
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Already trained today */}
      {todayLog && (
        <div className="px-4 mt-5">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {todayLog.completed ? "Séance terminée" : "Séance en cours"}
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {todayLog.routine_name || "Entraînement libre"}
                </p>
              </div>
              {!todayLog.completed && (
                <Link
                  href={`/sport/entrainement/${todayLog.id}`}
                  className="ml-auto bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transition-all"
                >
                  Continuer
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
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

      {/* My Routines */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">
            Mes routines
          </h2>
          <Link href="/sport/routines" className="text-sm text-primary-500 font-medium flex items-center gap-1">
            Voir tout <ChevronRight size={16} />
          </Link>
        </div>

        {routines.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-card">
            <div className="w-12 h-12 bg-warm-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Dumbbell size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Aucune routine</p>
            <Link
              href="/sport/routines/nouvelle"
              className="mt-3 inline-flex items-center gap-2 text-primary-500 font-semibold text-sm"
            >
              <Plus size={16} /> Créer ma première routine
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {routines.slice(0, 3).map((routine) => (
              <Link
                key={routine.id}
                href={`/sport/routines/${routine.id}`}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-card hover:shadow-card-hover transition-all block"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    routine.is_active
                      ? "bg-primary-50 dark:bg-primary-900/30"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}>
                    <Dumbbell size={18} className={
                      routine.is_active
                        ? "text-primary-500"
                        : "text-gray-400"
                    } />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {routine.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {routine.exercise_count} exercices • {routine.total_sets} séries
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Workouts */}
      {weekLogs.length > 0 && (
        <div className="px-4 mt-6 mb-24">
          <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
            Derniers entraînements
          </h2>
          <div className="space-y-2">
            {weekLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-3 flex items-center justify-between shadow-card"
              >
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
                      {format(new Date(log.date + "T00:00:00"), "EEEE d MMMM", { locale: fr })}
                    </p>
                  </div>
                </div>
                {log.duration_minutes && (
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    {log.duration_minutes} min
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeekOverview({ weekLogs }: { weekLogs: WorkoutLog[] }) {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex justify-between">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const log = weekLogs.find(l => l.date === dateStr);
        const isToday = dateStr === today;
        const isPast = day < new Date() && !isToday;

        return (
          <div key={dateStr} className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-medium uppercase ${
              isToday ? "text-primary-500" : "text-gray-400 dark:text-gray-500"
            }`}>
              {format(day, "EEE", { locale: fr })}
            </span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              log?.completed
                ? "bg-green-500 text-white"
                : log
                ? "bg-amber-500 text-white"
                : isToday
                ? "bg-primary-500 text-white"
                : isPast
                ? "bg-gray-100 dark:bg-gray-700 text-gray-400"
                : "bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500"
            }`}>
              {log?.completed ? (
                <Check size={14} />
              ) : (
                format(day, "d")
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
