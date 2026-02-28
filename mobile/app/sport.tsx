import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl, getHeaders } from "../src/lib/api";
import { colors } from "../src/theme/colors";

interface Routine {
  id: number;
  name: string;
  exercise_count: number;
  total_sets: number;
  is_active: boolean;
  days_of_week: number[];
}

interface WorkoutLog {
  id: number;
  routine_name: string;
  date: string;
  completed: boolean;
  duration_minutes: number;
}

export default function SportScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [weekLogs, setWeekLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");
  const currentDayOfWeek = new Date().getDay();

  const loadData = useCallback(async () => {
    try {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);
      const [routinesRes, logsRes] = await Promise.all([
        fetch(apiUrl("/api/routines"), { headers: getHeaders() }),
        fetch(
          apiUrl(
            `/api/workout-logs?startDate=${format(monday, "yyyy-MM-dd")}&endDate=${format(sunday, "yyyy-MM-dd")}`
          ),
          { headers: getHeaders() }
        ),
      ]);
      const routinesData = await routinesRes.json();
      const logsData = await logsRes.json();
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
      setWeekLogs(Array.isArray(logsData) ? logsData : []);
    } catch {
      // API non accessible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todaysRoutine = routines.find(
    (r) => r.is_active && r.days_of_week?.includes(currentDayOfWeek === 0 ? 7 : currentDayOfWeek)
  );
  const todayLog = weekLogs.find((log) => log.date === today);
  const completedThisWeek = weekLogs.filter((log) => log.completed).length;

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const startWorkout = async (routineId: number) => {
    try {
      const res = await fetch(apiUrl("/api/workout-logs"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ routine_id: routineId, date: today }),
      });
      if (!res.ok) return;
      await res.json();
      loadData();
    } catch {
      // Erreur réseau
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerSub}>Musculation</Text>
            <Text style={s.headerTitle}>Espace Sport</Text>
          </View>
          <View style={s.weekBadge}>
            <Text style={s.weekCount}>{completedThisWeek}</Text>
            <Text style={s.weekLabel}>séances</Text>
          </View>
        </View>

        {/* Space Switcher */}
        <View style={s.switcherWrapper}>
          <View style={s.switcher}>
            <TouchableOpacity
              style={s.switcherOption}
              onPress={() => router.replace("/(tabs)")}
              activeOpacity={0.7}
            >
              <Ionicons name="flame-outline" size={16} color={colors.gray[400]} />
              <Text style={s.switcherOptionText}>Nourriture</Text>
            </TouchableOpacity>
            <View style={s.switcherActive}>
              <Ionicons name="barbell-outline" size={16} color={colors.white} />
              <Text style={s.switcherActiveText}>Sport</Text>
            </View>
          </View>
        </View>

        {/* Week Overview */}
        <View style={s.weekCard}>
          <View style={s.weekRow}>
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const log = weekLogs.find((l) => l.date === dateStr);
              const isToday = dateStr === today;
              return (
                <View key={dateStr} style={s.dayCol}>
                  <Text style={[s.dayLabel, isToday && s.dayLabelToday]}>
                    {format(day, "EEE", { locale: fr })}
                  </Text>
                  <View
                    style={[
                      s.dayCircle,
                      log?.completed ? s.dayCircleDone : isToday ? s.dayCircleToday : s.dayCircleEmpty,
                    ]}
                  >
                    {log?.completed ? (
                      <Ionicons name="checkmark" size={13} color={colors.white} />
                    ) : (
                      <Text style={[s.dayNum, isToday && s.dayNumToday]}>
                        {format(day, "d")}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Today's Routine */}
        {todaysRoutine && !todayLog && (
          <>
            <Text style={s.sectionTitle}>Séance du jour</Text>
            <View style={s.todayCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.todayDate}>
                  {format(new Date(), "EEEE d MMMM", { locale: fr })}
                </Text>
                <Text style={s.todayName}>{todaysRoutine.name}</Text>
                <Text style={s.todayMeta}>
                  {todaysRoutine.exercise_count} exercices · {todaysRoutine.total_sets} séries
                </Text>
              </View>
              <TouchableOpacity style={s.goBtn} onPress={() => startWorkout(todaysRoutine.id)}>
                <Ionicons name="play" size={18} color="#3b82f6" />
                <Text style={s.goBtnText}>Go</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Done today */}
        {todayLog && (
          <View style={s.doneCard}>
            <View style={s.doneIcon}>
              <Ionicons name="checkmark" size={20} color={colors.white} />
            </View>
            <View>
              <Text style={s.doneTitle}>
                {todayLog.completed ? "Séance terminée" : "Séance en cours"}
              </Text>
              <Text style={s.doneSub}>{todayLog.routine_name || "Entraînement libre"}</Text>
            </View>
            {todayLog.duration_minutes ? (
              <Text style={s.doneDuration}>{todayLog.duration_minutes} min</Text>
            ) : null}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Actions rapides</Text>
        <View style={s.actionsRow}>
          {[
            { icon: "barbell-outline", label: "Exercices", color: "#3b82f6" },
            { icon: "list-outline", label: "Routines", color: "#a855f7" },
            { icon: "calendar-outline", label: "Planning", color: "#10b981" },
            { icon: "add-circle-outline", label: "Créer", color: colors.accent[500] },
          ].map((action, i) => (
            <View key={i} style={s.actionChip}>
              <View style={[s.actionIconBg, { backgroundColor: action.color + "18" }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={s.actionLabel}>{action.label}</Text>
            </View>
          ))}
        </View>

        {/* My Routines */}
        {!loading && (
          <>
            <Text style={s.sectionTitle}>Mes routines</Text>
            {routines.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <Ionicons name="barbell-outline" size={28} color={colors.gray[300]} />
                </View>
                <Text style={s.emptyTitle}>Aucune routine</Text>
                <Text style={s.emptyHint}>Créez une routine depuis l'application web</Text>
              </View>
            ) : (
              <View style={s.routinesList}>
                {routines.slice(0, 3).map((routine) => (
                  <View key={routine.id} style={s.routineRow}>
                    <View
                      style={[
                        s.routineIcon,
                        routine.is_active ? s.routineIconActive : s.routineIconInactive,
                      ]}
                    >
                      <Ionicons
                        name="barbell-outline"
                        size={18}
                        color={routine.is_active ? "#3b82f6" : colors.gray[400]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.routineName}>{routine.name}</Text>
                      <Text style={s.routineMeta}>
                        {routine.exercise_count} exercices · {routine.total_sets} séries
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.gray[300]} />
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Recent Workouts */}
        {weekLogs.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Cette semaine</Text>
            <View style={s.routinesList}>
              {weekLogs.slice(0, 5).map((log, i) => (
                <View key={i} style={s.routineRow}>
                  <View
                    style={[
                      s.routineIcon,
                      log.completed ? s.routineIconDone : s.routineIconPending,
                    ]}
                  >
                    <Ionicons
                      name={log.completed ? "checkmark-circle" : "time-outline"}
                      size={18}
                      color={log.completed ? "#10b981" : colors.accent[500]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.routineName}>
                      {log.routine_name || "Entraînement libre"}
                    </Text>
                    <Text style={s.routineMeta}>
                      {format(new Date(log.date + "T00:00:00"), "EEEE d MMMM", { locale: fr })}
                    </Text>
                  </View>
                  {log.duration_minutes ? (
                    <Text style={s.logDuration}>{log.duration_minutes} min</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warm[50] },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerSub: { fontSize: 13, color: colors.gray[500], fontWeight: "500" },
  headerTitle: { fontSize: 26, fontWeight: "800", color: colors.gray[900], letterSpacing: -0.5 },
  weekBadge: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  weekCount: { fontSize: 20, fontWeight: "800", color: "#3b82f6" },
  weekLabel: { fontSize: 10, color: colors.gray[400], fontWeight: "600" },

  // Space Switcher
  switcherWrapper: { paddingHorizontal: 20, marginTop: 16 },
  switcher: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 5,
    gap: 5,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  switcherOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
  },
  switcherOptionText: { fontSize: 13, fontWeight: "600", color: colors.gray[400] },
  switcherActive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: "#3b82f6",
  },
  switcherActiveText: { fontSize: 13, fontWeight: "700", color: colors.white },

  // Week
  weekCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 6 },
  dayLabel: { fontSize: 10, fontWeight: "700", color: colors.gray[400], textTransform: "uppercase" },
  dayLabelToday: { color: "#3b82f6" },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCircleDone: { backgroundColor: "#10b981" },
  dayCircleToday: { backgroundColor: "#3b82f6" },
  dayCircleEmpty: { backgroundColor: colors.gray[100] },
  dayNum: { fontSize: 12, fontWeight: "700", color: colors.gray[600] },
  dayNumToday: { color: colors.white },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray[900],
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },

  // Today routine card
  todayCard: {
    marginHorizontal: 20,
    backgroundColor: "#eff6ff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },
  todayDate: { fontSize: 11, color: "#60a5fa", fontWeight: "600", textTransform: "capitalize" },
  todayName: { fontSize: 17, fontWeight: "800", color: colors.gray[900], marginTop: 2 },
  todayMeta: { fontSize: 12, color: "#60a5fa", marginTop: 4 },
  goBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#3b82f6",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  goBtnText: { fontSize: 14, fontWeight: "700", color: "#3b82f6" },

  // Done card
  doneCard: {
    marginHorizontal: 20,
    backgroundColor: "#f0fdf4",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  doneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  doneTitle: { fontSize: 14, fontWeight: "700", color: "#065f46" },
  doneSub: { fontSize: 12, color: "#059669", marginTop: 2 },
  doneDuration: { marginLeft: "auto", fontSize: 12, color: colors.gray[400], fontWeight: "600" },

  // Quick actions
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
  },
  actionChip: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionLabel: { fontSize: 11, fontWeight: "700", color: colors.gray[600] },

  // Routines list
  routinesList: { paddingHorizontal: 20, gap: 8 },
  routineRow: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  routineIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  routineIconActive: { backgroundColor: "#eff6ff" },
  routineIconInactive: { backgroundColor: colors.gray[100] },
  routineIconDone: { backgroundColor: "#f0fdf4" },
  routineIconPending: { backgroundColor: colors.accent[50] },
  routineName: { fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  routineMeta: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  logDuration: { fontSize: 12, color: colors.gray[400], fontWeight: "600" },

  // Empty state
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warm[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.gray[700] },
  emptyHint: { fontSize: 13, color: colors.gray[400], marginTop: 4, textAlign: "center" },
});
