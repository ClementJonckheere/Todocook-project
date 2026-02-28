import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { format, addDays, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl, getHeaders } from "../../src/lib/api";
import { colors } from "../../src/theme/colors";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  daily_calorie_goal: number;
}

interface Recipe {
  id: number;
  name: string;
  calories: number;
  prep_time: number;
  cook_time: number;
}

interface MealPlan {
  id: number;
  recipe_id: number;
  recipe_name: string;
  date: string;
  meal_type: string;
  calories: number;
}

const mealTypes = [
  { key: "petit-dejeuner", label: "Petit-dej", icon: "sunny-outline" as const, color: "#f59e0b" },
  { key: "dejeuner", label: "Dejeuner", icon: "restaurant-outline" as const, color: colors.primary[500] },
  { key: "diner", label: "Diner", icon: "moon-outline" as const, color: "#8b5cf6" },
  { key: "collation", label: "Collation", icon: "cafe-outline" as const, color: "#3b82f6" },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedMealType, setSelectedMealType] = useState("dejeuner");
  const [todayMeals, setTodayMeals] = useState<MealPlan[]>([]);
  const [weekMeals, setWeekMeals] = useState<MealPlan[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const calorieGoal = user?.daily_calorie_goal || 2000;
  const caloriePercent = Math.min((todayCalories / calorieGoal) * 100, 100);

  const loadData = useCallback(async () => {
    try {
      const [userRes, mealsRes] = await Promise.all([
        fetch(apiUrl("/api/users"), { headers: getHeaders() }),
        fetch(apiUrl(`/api/meal-plans?userId=1&startDate=${today}&endDate=${today}`), { headers: getHeaders() }),
      ]);
      if (!userRes.ok || !mealsRes.ok) return;
      const userData = await userRes.json();
      const mealsData = await mealsRes.json();
      if (userData && typeof userData === "object") setUser(userData);
      setTodayMeals(Array.isArray(mealsData) ? mealsData : []);

      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekRes = await fetch(
        apiUrl(`/api/meal-plans?userId=1&startDate=${format(monday, "yyyy-MM-dd")}&endDate=${format(addDays(monday, 6), "yyyy-MM-dd")}`),
        { headers: getHeaders() }
      );
      if (weekRes.ok) {
        const weekData = await weekRes.json();
        setWeekMeals(Array.isArray(weekData) ? weekData : []);
      }
    } catch {
      setTodayMeals([]);
      setWeekMeals([]);
    }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(apiUrl(`/api/recipes?search=${encodeURIComponent(searchQuery)}`), { headers: getHeaders() });
          setSearchResults(await res.json());
        } catch { setSearchResults([]); }
      }, 300);
      return () => clearTimeout(timer);
    } else { setSearchResults([]); }
  }, [searchQuery]);

  const addMeal = async (recipeId: number, mealType: string) => {
    try {
      await fetch(apiUrl("/api/meal-plans"), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ user_id: 1, recipe_id: recipeId, date: today, meal_type: mealType }),
      });
      setSelectedRecipe(null);
      setSearchQuery("");
      setShowSearch(false);
      loadData();
    } catch { Alert.alert("Erreur", "Impossible d'ajouter le repas"); }
  };

  const removeMeal = async (id: number) => {
    try {
      await fetch(apiUrl(`/api/meal-plans?id=${id}`), { method: "DELETE", headers: getHeaders() });
      loadData();
    } catch { Alert.alert("Erreur", "Impossible de supprimer le repas"); }
  };

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header with greeting & calorie ring */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Bonjour,</Text>
            <Text style={s.userName}>{user?.first_name || "..."}</Text>
          </View>
          <View style={s.calorieRing}>
            <Text style={s.calorieValue}>{Math.round(todayCalories)}</Text>
            <Text style={s.calorieUnit}>/{calorieGoal} kcal</Text>
          </View>
        </View>

        {/* Calorie progress */}
        <View style={s.progressWrapper}>
          <View style={s.progressBg}>
            <View
              style={[
                s.progressBar,
                {
                  width: `${caloriePercent}%`,
                  backgroundColor: caloriePercent > 90 ? colors.red[500] : caloriePercent > 70 ? colors.accent[500] : colors.primary[400],
                },
              ]}
            />
          </View>
        </View>

        {/* Space Switcher */}
        <View style={s.switcherWrapper}>
          <View style={s.switcher}>
            <View style={s.switcherActive}>
              <Ionicons name="flame-outline" size={16} color={colors.white} />
              <Text style={s.switcherActiveText}>Nourriture</Text>
            </View>
            <TouchableOpacity
              style={s.switcherOption}
              onPress={() => router.push("/sport")}
              activeOpacity={0.7}
            >
              <Ionicons name="barbell-outline" size={16} color={colors.gray[400]} />
              <Text style={s.switcherOptionText}>Sport</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick actions row */}
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.actionChip} onPress={() => setShowSearch(!showSearch)}>
            <Ionicons name="search-outline" size={18} color={colors.primary[600]} />
            <Text style={s.actionChipText}>Chercher</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionChip} onPress={() => router.push("/creation-recette")}>
            <Ionicons name="add-circle-outline" size={18} color={colors.accent[500]} />
            <Text style={s.actionChipText}>Creer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionChip} onPress={() => router.push("/pense-bete")}>
            <Ionicons name="cart-outline" size={18} color={colors.blue[500]} />
            <Text style={s.actionChipText}>Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionChip} onPress={() => router.push("/suggestions-recettes")}>
            <Ionicons name="sparkles-outline" size={18} color={colors.purple[500]} />
            <Text style={s.actionChipText}>Idees</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        {showSearch && (
          <View style={s.searchCard}>
            <View style={s.searchInputRow}>
              <Ionicons name="search" size={18} color={colors.gray[400]} />
              <TextInput
                style={s.searchInput}
                placeholder="Rechercher une recette..."
                placeholderTextColor={colors.gray[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => { setSearchQuery(""); setShowSearch(false); }}>
                  <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
                </TouchableOpacity>
              ) : null}
            </View>
            {searchResults.map((r) => (
              <TouchableOpacity key={r.id} style={s.searchResult} onPress={() => setSelectedRecipe(r)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.searchResultName}>{r.name}</Text>
                  <Text style={s.searchResultMeta}>
                    {r.calories} kcal
                    {r.prep_time ? ` · ${r.prep_time + (r.cook_time || 0)} min` : ""}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color={colors.primary[400]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add meal modal */}
        <Modal visible={!!selectedRecipe} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Ajouter un repas</Text>
                <TouchableOpacity onPress={() => setSelectedRecipe(null)}>
                  <Ionicons name="close" size={24} color={colors.gray[500]} />
                </TouchableOpacity>
              </View>
              <Text style={s.modalRecipeName}>{selectedRecipe?.name}</Text>
              <Text style={s.modalSubtitle}>Type de repas</Text>
              <View style={s.mealTypesGrid}>
                {mealTypes.map((mt) => (
                  <TouchableOpacity
                    key={mt.key}
                    style={[
                      s.mealTypeChip,
                      selectedMealType === mt.key && { backgroundColor: mt.color, borderColor: mt.color },
                    ]}
                    onPress={() => setSelectedMealType(mt.key)}
                  >
                    <Ionicons
                      name={mt.icon}
                      size={18}
                      color={selectedMealType === mt.key ? colors.white : colors.gray[500]}
                    />
                    <Text
                      style={[
                        s.mealTypeLabel,
                        selectedMealType === mt.key && { color: colors.white },
                      ]}
                    >
                      {mt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={() => selectedRecipe && addMeal(selectedRecipe.id, selectedMealType)}
              >
                <Text style={s.confirmTxt}>Ajouter au planning</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Today's meals */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Aujourd'hui</Text>
          <Text style={s.sectionCount}>{todayMeals.length} repas</Text>
        </View>
        {todayMeals.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Ionicons name="restaurant-outline" size={28} color={colors.gray[300]} />
            </View>
            <Text style={s.emptyTitle}>Aucun repas planifie</Text>
            <Text style={s.emptyHint}>Cherchez une recette pour commencer</Text>
          </View>
        ) : (
          <View style={s.mealsList}>
            {todayMeals.map((meal) => {
              const mt = mealTypes.find((t) => t.key === meal.meal_type);
              return (
                <View key={meal.id} style={s.mealCard}>
                  <View style={[s.mealIcon, { backgroundColor: (mt?.color || colors.gray[400]) + "18" }]}>
                    <Ionicons name={(mt?.icon || "restaurant-outline") as any} size={18} color={mt?.color || colors.gray[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mealName}>{meal.recipe_name}</Text>
                    <Text style={s.mealMeta}>{mt?.label} · {meal.calories} kcal</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMeal(meal.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.gray[400]} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Week overview */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Cette semaine</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayMeals = weekMeals.filter((m) => m.date === dateStr);
            const isToday = dateStr === today;
            const dayCals = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
            return (
              <View key={dateStr} style={[s.dayCard, isToday && s.dayCardToday]}>
                <Text style={[s.dayName, isToday && { color: colors.primary[600] }]}>
                  {format(day, "EEE", { locale: fr })}
                </Text>
                <Text style={[s.dayNum, isToday && { color: colors.primary[500] }]}>
                  {format(day, "d")}
                </Text>
                <View style={[s.dayDot, dayMeals.length > 0 ? { backgroundColor: colors.primary[400] } : { backgroundColor: colors.gray[200] }]} />
                <Text style={s.dayCals}>{dayCals > 0 ? `${dayCals}` : "-"}</Text>
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warm[50] },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  greeting: { fontSize: 14, color: colors.gray[500], fontWeight: "500" },
  userName: { fontSize: 26, fontWeight: "800", color: colors.gray[900], letterSpacing: -0.5 },
  calorieRing: { alignItems: "center", backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  calorieValue: { fontSize: 20, fontWeight: "800", color: colors.accent[500] },
  calorieUnit: { fontSize: 10, color: colors.gray[400], fontWeight: "600" },

  // Progress
  progressWrapper: { paddingHorizontal: 20, marginTop: 12 },
  progressBg: { height: 6, backgroundColor: colors.warm[200], borderRadius: 3, overflow: "hidden" },
  progressBar: { height: 6, borderRadius: 3 },

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
  switcherActive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: colors.primary[500],
  },
  switcherActiveText: { fontSize: 13, fontWeight: "700", color: colors.white },
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

  // Quick actions
  actionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 20 },
  actionChip: { flex: 1, flexDirection: "column", alignItems: "center", gap: 6, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  actionChipText: { fontSize: 11, fontWeight: "700", color: colors.gray[600] },

  // Search
  searchCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  searchInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.gray[50], borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12, color: colors.gray[900] },
  searchResult: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  searchResultName: { fontSize: 15, fontWeight: "600", color: colors.gray[900] },
  searchResultMeta: { fontSize: 12, color: colors.gray[500], marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 13, fontWeight: "700", color: colors.gray[400], textTransform: "uppercase", letterSpacing: 1 },
  modalRecipeName: { fontSize: 20, fontWeight: "800", color: colors.gray[900], marginBottom: 20 },
  modalSubtitle: { fontSize: 13, fontWeight: "600", color: colors.gray[500], marginBottom: 12 },
  mealTypesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mealTypeChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.gray[200], minWidth: "45%" },
  mealTypeLabel: { fontSize: 14, fontWeight: "600", color: colors.gray[700] },
  confirmBtn: { marginTop: 24, backgroundColor: colors.primary[500], borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  confirmTxt: { fontSize: 16, fontWeight: "700", color: colors.white },

  // Section
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.gray[900], letterSpacing: -0.3 },
  sectionCount: { fontSize: 13, fontWeight: "600", color: colors.gray[400] },

  // Empty state
  emptyCard: { marginHorizontal: 20, backgroundColor: colors.white, borderRadius: 20, padding: 36, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.warm[100], justifyContent: "center", alignItems: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.gray[700] },
  emptyHint: { fontSize: 13, color: colors.gray[400], marginTop: 4 },

  // Meal cards
  mealsList: { paddingHorizontal: 20, gap: 8 },
  mealCard: { backgroundColor: colors.white, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  mealIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  mealName: { fontSize: 15, fontWeight: "700", color: colors.gray[900] },
  mealMeta: { fontSize: 12, color: colors.gray[500], marginTop: 2 },

  // Week
  dayCard: { width: 72, backgroundColor: colors.white, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", marginRight: 8, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  dayCardToday: { backgroundColor: colors.primary[50], borderWidth: 2, borderColor: colors.primary[400] },
  dayName: { fontSize: 11, fontWeight: "700", color: colors.gray[500], textTransform: "uppercase", letterSpacing: 0.5 },
  dayNum: { fontSize: 22, fontWeight: "800", color: colors.gray[900], marginTop: 4 },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  dayCals: { fontSize: 10, fontWeight: "700", color: colors.accent[500], marginTop: 4 },
});
