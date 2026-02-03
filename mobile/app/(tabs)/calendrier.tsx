import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl } from "../../src/lib/api";
import { colors } from "../../src/theme/colors";

interface MealPlan {
  id: number;
  recipe_name: string;
  date: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time: number;
  servings: number;
}

const mealTypeColors: Record<string, { bg: string; text: string }> = {
  "petit-dejeuner": { bg: colors.amber[100], text: colors.amber[700] },
  dejeuner: { bg: colors.primary[100], text: colors.primary[700] },
  diner: { bg: colors.purple[100], text: colors.purple[600] },
  collation: { bg: colors.blue[100], text: colors.blue[600] },
};

const mealTypeLabels: Record<string, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
};

export default function CalendrierScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(format(new Date(), "yyyy-MM-dd"));

  const monday = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const loadMeals = useCallback(async () => {
    const start = format(monday, "yyyy-MM-dd");
    const end = format(addDays(monday, 6), "yyyy-MM-dd");
    try {
      const res = await fetch(apiUrl(`/api/meal-plans?userId=1&startDate=${start}&endDate=${end}`));
      setMeals(await res.json());
    } catch {
      // API not reachable
    }
  }, [weekOffset]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  const removeMeal = async (id: number) => {
    try {
      await fetch(apiUrl(`/api/meal-plans?id=${id}`), { method: "DELETE" });
      loadMeals();
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer le repas");
    }
  };

  const weekTotals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with nav */}
        <View style={s.header}>
          <Text style={s.title}>Calendrier</Text>
          <View style={s.weekNav}>
            <TouchableOpacity onPress={() => setWeekOffset((w) => w - 1)} style={s.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={s.weekLabel}>
              {format(monday, "d MMM", { locale: fr })} - {format(addDays(monday, 6), "d MMM yyyy", { locale: fr })}
            </Text>
            <TouchableOpacity onPress={() => setWeekOffset((w) => w + 1)} style={s.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Week totals */}
        <View style={s.totalsCard}>
          <View style={s.totalItem}>
            <Text style={s.totalValue}>{weekTotals.calories}</Text>
            <Text style={s.totalLabel}>kcal</Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalItem}>
            <Text style={s.totalValue}>{Math.round(weekTotals.protein)}g</Text>
            <Text style={s.totalLabel}>Protéines</Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalItem}>
            <Text style={s.totalValue}>{Math.round(weekTotals.carbs)}g</Text>
            <Text style={s.totalLabel}>Glucides</Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalItem}>
            <Text style={s.totalValue}>{Math.round(weekTotals.fat)}g</Text>
            <Text style={s.totalLabel}>Lipides</Text>
          </View>
        </View>

        {/* Day cards */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayMeals = meals.filter((m) => m.date === dateStr);
          const isToday = dateStr === today;
          const expanded = expandedDay === dateStr;
          const dayCals = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

          return (
            <TouchableOpacity
              key={dateStr}
              activeOpacity={0.7}
              onPress={() => setExpandedDay(expanded ? null : dateStr)}
              style={[s.dayCard, isToday && s.dayCardToday]}
            >
              <View style={s.dayHeader}>
                <View>
                  <Text style={[s.dayName, isToday && { color: colors.primary[600] }]}>
                    {format(day, "EEEE d MMMM", { locale: fr })}
                  </Text>
                  <Text style={s.dayInfo}>
                    {dayMeals.length} repas · {dayCals} kcal
                  </Text>
                </View>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.gray[400]}
                />
              </View>

              {expanded && dayMeals.length > 0 && (
                <View style={s.mealsContainer}>
                  {dayMeals.map((meal) => {
                    const mtc = mealTypeColors[meal.meal_type] || mealTypeColors.collation;
                    return (
                      <View key={meal.id} style={s.mealRow}>
                        <View style={[s.mealTypeBadge, { backgroundColor: mtc.bg }]}>
                          <Text style={[s.mealTypeText, { color: mtc.text }]}>
                            {mealTypeLabels[meal.meal_type] || meal.meal_type}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.mealName}>{meal.recipe_name}</Text>
                          <Text style={s.mealDetail}>
                            {meal.calories} kcal
                            {meal.prep_time || meal.cook_time
                              ? ` · ${(meal.prep_time || 0) + (meal.cook_time || 0)} min`
                              : ""}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => removeMeal(meal.id)}>
                          <Ionicons name="trash-outline" size={18} color={colors.red[400]} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {expanded && dayMeals.length === 0 && (
                <Text style={s.noMeals}>Aucun repas planifié</Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "bold", color: colors.gray[900] },
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  weekLabel: { fontSize: 14, fontWeight: "600", color: colors.gray[700] },
  totalsCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.white, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-around", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  totalItem: { alignItems: "center" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: colors.gray[900] },
  totalLabel: { fontSize: 10, color: colors.gray[500], marginTop: 2 },
  totalDivider: { width: 1, height: 28, backgroundColor: colors.gray[200] },
  dayCard: { marginHorizontal: 20, marginTop: 10, backgroundColor: colors.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  dayCardToday: { borderWidth: 2, borderColor: colors.primary[400] },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayName: { fontSize: 14, fontWeight: "700", color: colors.gray[900], textTransform: "capitalize" },
  dayInfo: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  mealsContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.gray[100], paddingTop: 12 },
  mealRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  mealTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mealTypeText: { fontSize: 10, fontWeight: "700" },
  mealName: { fontSize: 13, fontWeight: "600", color: colors.gray[900] },
  mealDetail: { fontSize: 11, color: colors.gray[500], marginTop: 1 },
  noMeals: { fontSize: 13, color: colors.gray[400], textAlign: "center", marginTop: 12, fontStyle: "italic" },
});
