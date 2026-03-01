import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl, getHeaders } from "../src/lib/api";
import { colors } from "../src/theme/colors";

interface SuggestedRecipe {
  id: number;
  name: string;
  description: string;
  calories: number;
  prep_time: number;
  cook_time: number;
  servings: number;
  missing_count: number;
  total_ingredients: number;
  missing_ingredient_names: string[];
}

export default function SuggestionsRecettesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ maxMissing: string }>();
  const maxMissing = parseInt(params.maxMissing || "0");

  const [recipes, setRecipes] = useState<SuggestedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState(maxMissing);

  const loadRecipes = async (currentOffset: number, currentFilter: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/suggestions?maxMissing=${currentFilter}&offset=${currentOffset}`),
        { headers: getHeaders() }
      );
      const data = await res.json();
      setRecipes(data.recipes || []);
      setHasMore(data.hasMore || false);
      setTotal(data.total || 0);
    } catch {
      setRecipes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecipes(0, filter);
  }, [filter]);

  const loadMore = () => {
    const newOffset = offset + 10;
    setOffset(newOffset);
    loadRecipes(newOffset, filter);
  };

  const reload = () => {
    setOffset(0);
    loadRecipes(0, filter);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Suggestions</Text>
            <Text style={s.subtitle}>
              {total} recette{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Filter */}
        <View style={s.filterCard}>
          <Text style={s.filterLabel}>Aliments manquants autorisés :</Text>
          <View style={s.filterRow}>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[s.filterBtn, filter === n && s.filterBtnActive]}
                onPress={() => {
                  setFilter(n);
                  setOffset(0);
                }}
              >
                <Text style={[s.filterBtnText, filter === n && { color: colors.white }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={s.loadingText}>Recherche de recettes...</Text>
          </View>
        ) : recipes.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="restaurant-outline" size={40} color={colors.gray[300]} />
            <Text style={s.emptyTitle}>Aucune recette trouvée</Text>
            <Text style={s.emptyHint}>Augmentez le nombre d'aliments manquants autorisés</Text>
          </View>
        ) : (
          <>
            {recipes.map((recipe) => (
              <View key={recipe.id} style={s.recipeCard}>
                <View style={s.recipeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recipeName}>{recipe.name}</Text>
                    {recipe.description ? (
                      <Text style={s.recipeDesc}>{recipe.description}</Text>
                    ) : null}
                  </View>
                  {recipe.missing_count > 0 ? (
                    <View style={s.missingBadge}>
                      <Text style={s.missingBadgeText}>
                        {recipe.missing_count} manquant{recipe.missing_count > 1 ? "s" : ""}
                      </Text>
                    </View>
                  ) : (
                    <View style={s.completeBadge}>
                      <Text style={s.completeBadgeText}>Complet</Text>
                    </View>
                  )}
                </View>

                <View style={s.statsRow}>
                  <View style={s.stat}>
                    <Ionicons name="flame" size={14} color={colors.accent[500]} />
                    <Text style={s.statText}>{recipe.calories} kcal</Text>
                  </View>
                  {(recipe.prep_time || recipe.cook_time) ? (
                    <View style={s.stat}>
                      <Ionicons name="time-outline" size={14} color={colors.gray[400]} />
                      <Text style={s.statText}>
                        {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                      </Text>
                    </View>
                  ) : null}
                  <View style={s.stat}>
                    <Ionicons name="people-outline" size={14} color={colors.gray[400]} />
                    <Text style={s.statText}>{recipe.servings} pers.</Text>
                  </View>
                </View>

                {recipe.missing_count > 0 && recipe.missing_ingredient_names?.length > 0 && (
                  <View style={s.missingBox}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <Ionicons name="alert-circle" size={14} color={colors.accent[600]} />
                      <Text style={s.missingTitle}>Il vous manque :</Text>
                    </View>
                    <Text style={s.missingList}>{recipe.missing_ingredient_names.join(", ")}</Text>
                  </View>
                )}
              </View>
            ))}

            <View style={s.actions}>
              {hasMore ? (
                <TouchableOpacity style={s.actionBtn} onPress={loadMore}>
                  <Text style={s.actionBtnText}>Voir plus de recettes</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.reloadBtn} onPress={reload}>
                  <Ionicons name="refresh" size={18} color={colors.gray[600]} />
                  <Text style={s.reloadText}>Recharger</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray[100], justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", color: colors.gray[900] },
  subtitle: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  filterCard: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.white, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  filterLabel: { fontSize: 11, color: colors.gray[500], marginBottom: 8 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.gray[100], alignItems: "center" },
  filterBtnActive: { backgroundColor: colors.primary[500] },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  loadingCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 40, alignItems: "center" },
  loadingText: { fontSize: 14, color: colors.gray[500], marginTop: 12 },
  emptyCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 40, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.gray[600], marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.gray[400], marginTop: 4, textAlign: "center" },
  recipeCard: { marginHorizontal: 20, marginTop: 10, backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  recipeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  recipeName: { fontSize: 15, fontWeight: "bold", color: colors.gray[900] },
  recipeDesc: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  missingBadge: { backgroundColor: colors.orange[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  missingBadgeText: { fontSize: 11, fontWeight: "600", color: colors.orange[700] },
  completeBadge: { backgroundColor: colors.primary[100], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  completeBadgeText: { fontSize: 11, fontWeight: "600", color: colors.primary[700] },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: colors.gray[500] },
  missingBox: { marginTop: 12, backgroundColor: colors.orange[50], borderRadius: 10, padding: 10 },
  missingTitle: { fontSize: 11, fontWeight: "700", color: colors.orange[700] },
  missingList: { fontSize: 11, color: colors.orange[600] },
  actions: { marginHorizontal: 20, marginTop: 16 },
  actionBtn: { backgroundColor: colors.primary[500], borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  actionBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  reloadBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: colors.gray[200] },
  reloadText: { fontSize: 15, fontWeight: "600", color: colors.gray[700] },
});
