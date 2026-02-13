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
import { format, addDays, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { apiUrl } from "../../src/lib/api";
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
  { key: "petit-dejeuner", label: "Petit-déj", color: colors.amber[600] },
  { key: "dejeuner", label: "Déjeuner", color: colors.primary[600] },
  { key: "diner", label: "Dîner", color: colors.purple[600] },
  { key: "collation", label: "Collation", color: colors.blue[600] },
];

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedMealType, setSelectedMealType] = useState("dejeuner");
  const [todayMeals, setTodayMeals] = useState<MealPlan[]>([]);
  const [weekMeals, setWeekMeals] = useState<MealPlan[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    try {
      const [userRes, mealsRes] = await Promise.all([
        fetch(apiUrl("/api/users")),
        fetch(apiUrl(`/api/meal-plans?userId=1&startDate=${today}&endDate=${today}`)),
      ]);

      // Check if responses are ok
      if (!userRes.ok || !mealsRes.ok) {
        console.error("API error:", userRes.status, mealsRes.status);
        return;
      }

      const userData = await userRes.json();
      const mealsData = await mealsRes.json();

      // Ensure we have valid data
      if (userData && typeof userData === 'object') {
        setUser(userData);
      }
      const mealsArray = Array.isArray(mealsData) ? mealsData : [];
      setTodayMeals(mealsArray);
      setTodayCalories(mealsArray.reduce((sum: number, m: MealPlan) => sum + (m.calories || 0), 0));

      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekRes = await fetch(
        apiUrl(`/api/meal-plans?userId=1&startDate=${format(monday, "yyyy-MM-dd")}&endDate=${format(addDays(monday, 6), "yyyy-MM-dd")}`)
      );
      if (weekRes.ok) {
        const weekData = await weekRes.json();
        setWeekMeals(Array.isArray(weekData) ? weekData : []);
      }
    } catch (err) {
      console.error("Load data error:", err);
      // Keep empty arrays on error
      setTodayMeals([]);
      setWeekMeals([]);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(apiUrl(`/api/recipes?search=${encodeURIComponent(searchQuery)}`));
          setSearchResults(await res.json());
        } catch {
          setSearchResults([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const addMeal = async (recipeId: number, mealType: string) => {
    try {
      await fetch(apiUrl("/api/meal-plans"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: 1, recipe_id: recipeId, date: today, meal_type: mealType }),
      });
      setSelectedRecipe(null);
      setSearchQuery("");
      setShowSearch(false);
      loadData();
    } catch {
      Alert.alert("Erreur", "Impossible d'ajouter le repas");
    }
  };

  const removeMeal = async (id: number) => {
    try {
      await fetch(apiUrl(`/api/meal-plans?id=${id}`), { method: "DELETE" });
      loadData();
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer le repas");
    }
  };

  const caloriePercent = user ? Math.min((todayCalories / user.daily_calorie_goal) * 100, 100) : 0;
  const barColor = caloriePercent < 70 ? colors.primary[500] : caloriePercent < 90 ? colors.accent[500] : colors.red[500];

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Bonjour {user?.first_name || ""}</Text>
            <Text style={s.subtitle}>Que mange-t-on aujourd'hui ?</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={s.searchBtn}>
            <Ionicons name="search" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Calorie Bar */}
        <View style={s.calorieCard}>
          <View style={s.calorieRow}>
            <Ionicons name="flame" size={20} color={colors.accent[500]} />
            <Text style={s.calorieText}>{todayCalories} / {user?.daily_calorie_goal || 2000} kcal</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressBar, { width: `${caloriePercent}%`, backgroundColor: barColor }]} />
          </View>
        </View>

        {/* Search */}
        {showSearch && (
          <View style={s.searchCard}>
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher une recette..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchResults.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={s.searchResult}
                onPress={() => setSelectedRecipe(r)}
              >
                <Text style={s.searchResultName}>{r.name}</Text>
                <Text style={s.searchResultCal}>{r.calories} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Meal type selection modal */}
        <Modal visible={!!selectedRecipe} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Ajouter "{selectedRecipe?.name}"</Text>
              <Text style={s.modalSubtitle}>Choisissez le type de repas :</Text>
              {mealTypes.map((mt) => (
                <TouchableOpacity
                  key={mt.key}
                  style={[s.mealTypeBtn, selectedMealType === mt.key && { backgroundColor: mt.color }]}
                  onPress={() => setSelectedMealType(mt.key)}
                >
                  <Text style={[s.mealTypeTxt, selectedMealType === mt.key && { color: colors.white }]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setSelectedRecipe(null)}>
                  <Text style={s.cancelTxt}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.confirmBtn}
                  onPress={() => selectedRecipe && addMeal(selectedRecipe.id, selectedMealType)}
                >
                  <Text style={s.confirmTxt}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Today's meals */}
        <Text style={s.sectionTitle}>Repas du jour</Text>
        {todayMeals.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="restaurant-outline" size={32} color={colors.gray[300]} />
            <Text style={s.emptyText}>Aucun repas planifié</Text>
          </View>
        ) : (
          todayMeals.map((meal) => {
            const mt = mealTypes.find((t) => t.key === meal.meal_type);
            return (
              <View key={meal.id} style={s.mealCard}>
                <View style={[s.mealDot, { backgroundColor: mt?.color || colors.gray[400] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.mealName}>{meal.recipe_name}</Text>
                  <Text style={s.mealInfo}>{mt?.label} · {meal.calories} kcal</Text>
                </View>
                <TouchableOpacity onPress={() => removeMeal(meal.id)}>
                  <Ionicons name="close-circle" size={22} color={colors.red[400]} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Week overview */}
        <Text style={s.sectionTitle}>Cette semaine</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayMeals = weekMeals.filter((m) => m.date === dateStr);
            const isToday = dateStr === today;
            const dayCals = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
            return (
              <View key={dateStr} style={[s.dayCard, isToday && s.dayCardToday]}>
                <Text style={s.dayName}>{format(day, "EEE", { locale: fr })}</Text>
                <Text style={[s.dayNum, isToday && { color: colors.primary[600] }]}>
                  {format(day, "d")}
                </Text>
                <Text style={s.dayMeals}>{dayMeals.length} repas</Text>
                <Text style={s.dayCals}>{dayCals} kcal</Text>
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: "bold", color: colors.gray[900] },
  subtitle: { fontSize: 14, color: colors.gray[500], marginTop: 2 },
  searchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gray[100], justifyContent: "center", alignItems: "center" },
  calorieCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  calorieRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  calorieText: { fontSize: 16, fontWeight: "700", color: colors.gray[900] },
  progressBg: { height: 8, backgroundColor: colors.gray[100], borderRadius: 4, overflow: "hidden" },
  progressBar: { height: 8, borderRadius: 4 },
  searchCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { backgroundColor: colors.gray[50], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: colors.gray[200] },
  searchResult: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  searchResultName: { fontSize: 14, fontWeight: "600", color: colors.gray[900] },
  searchResultCal: { fontSize: 12, color: colors.accent[500] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: "100%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: colors.gray[900], marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: colors.gray[500], marginBottom: 16 },
  mealTypeBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.gray[200], marginBottom: 8 },
  mealTypeTxt: { fontSize: 14, fontWeight: "600", color: colors.gray[700], textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.gray[100], alignItems: "center" },
  cancelTxt: { fontWeight: "600", color: colors.gray[600] },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary[500], alignItems: "center" },
  confirmTxt: { fontWeight: "600", color: colors.white },
  sectionTitle: { fontSize: 17, fontWeight: "bold", color: colors.gray[900], marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  emptyCard: { marginHorizontal: 20, backgroundColor: colors.white, borderRadius: 16, padding: 32, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyText: { fontSize: 14, color: colors.gray[500], marginTop: 8 },
  mealCard: { marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.white, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  mealDot: { width: 8, height: 8, borderRadius: 4 },
  mealName: { fontSize: 14, fontWeight: "600", color: colors.gray[900] },
  mealInfo: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  dayCard: { width: 90, backgroundColor: colors.white, borderRadius: 14, padding: 12, alignItems: "center", marginRight: 8, marginLeft: 0 },
  dayCardToday: { backgroundColor: colors.primary[50], borderWidth: 2, borderColor: colors.primary[500] },
  dayName: { fontSize: 11, fontWeight: "600", color: colors.gray[500], textTransform: "capitalize" },
  dayNum: { fontSize: 20, fontWeight: "bold", color: colors.gray[900], marginVertical: 4 },
  dayMeals: { fontSize: 11, color: colors.gray[500] },
  dayCals: { fontSize: 10, fontWeight: "600", color: colors.accent[500], marginTop: 2 },
});
