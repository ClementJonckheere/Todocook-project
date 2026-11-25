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
import { format } from "date-fns";
import { apiUrl, apiRequest } from "../src/lib/api";
import { formatNumber, parseDecimal, validPortions } from "../src/lib/food-journal";
import { PortionStepper } from "../src/components/PortionStepper";
import { DinnerExclusions } from "../src/components/DinnerExclusions";
import { colors } from "../src/theme/colors";

interface SuggestedRecipe {
  id: number;
  name: string;
  description: string;
  /** Valeurs pour la recette entière (servings portions) */
  calories: number;
  protein: number;
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  instructions: string | null;
  missing_count: number;
  total_ingredients: number;
  missing_ingredient_names: string[];
  /** Portions conseillées pour approcher un tiers des cibles journalières */
  suggested_portions: number;
  /** Ingrédients déjà multipliés par les portions conseillées */
  dinner_ingredients: { id: number; name: string; quantity: number; unit: string }[];
}

type NutritionGoal = "maintien" | "prise_masse" | "perte_poids";

const GOAL_LABELS: Record<NutritionGoal, string> = {
  maintien: "Équilibre / maintien",
  prise_masse: "Prise de masse",
  perte_poids: "Perte de poids",
};

interface DinnerTarget {
  goal: NutritionGoal;
  calories: number;
  protein: number;
}

const TIME_LIMITS = [15, 30, 45, 60];

const toInput = (value: number) => String(value).replace(".", ",");

export default function SuggestionsRecettesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ maxMissing: string }>();
  const initialFilter = params.maxMissing === undefined ? -1 : parseInt(params.maxMissing) || 0;

  const [recipes, setRecipes] = useState<SuggestedRecipe[]>([]);
  const [target, setTarget] = useState<DinnerTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState(initialFilter);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  // Portions choisies par recette (pré-remplies avec la portion conseillée)
  const [portions, setPortions] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      if (offset === 0) setRecipes([]);
      try {
        const query = new URLSearchParams({
          personalize: "dinner",
          maxMissing: filter < 0 ? "all" : String(filter),
          offset: String(offset),
        });
        if (minutes) query.set("maxMinutes", String(minutes));
        const res = await apiRequest(apiUrl(`/api/suggestions?${query}`));
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        const list: SuggestedRecipe[] = data.recipes || [];
        setRecipes((previous) => (offset ? [...previous, ...list] : list));
        setPortions((previous) => {
          const next = { ...previous };
          list.forEach((recipe) => { next[recipe.id] ??= toInput(recipe.suggested_portions); });
          return next;
        });
        setTarget(data.dinner_target ?? null);
        setHasMore(Boolean(data.hasMore));
        setTotal(data.total || 0);
      } catch {
        if (!cancelled) setError("Impossible de charger les recettes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter, minutes, offset, retry]);

  const changeFilter = (next: () => void) => {
    next();
    setOffset(0);
  };

  const planDinner = async (recipe: SuggestedRecipe) => {
    const planned = parseDecimal(portions[recipe.id] ?? "");
    if (!validPortions(planned)) return;
    setSaving(recipe.id);
    setError("");
    try {
      const res = await apiRequest(apiUrl("/api/meal-plans"), {
        method: "POST",
        body: JSON.stringify({
          recipe_id: recipe.id,
          planned_portions: planned,
          date: format(new Date(), "yyyy-MM-dd"),
          meal_type: "diner",
        }),
      });
      if (!res.ok) throw new Error();
      router.replace("/(tabs)");
    } catch {
      setError("Impossible de planifier le dîner. Réessayez.");
      setSaving(null);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Trouver mon dîner</Text>
            <Text style={s.subtitle}>
              {total} recette{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Cible utilisée pour conseiller les portions */}
        <View style={s.targetCard}>
          <Ionicons name={target ? "flag-outline" : "information-circle-outline"} size={18} color={colors.primary[600]} />
          {target ? (
            <Text style={s.targetText}>
              <Text style={s.targetBold}>{GOAL_LABELS[target.goal]}</Text> · Portions conseillées pour environ{" "}
              {target.calories} kcal et {target.protein} g de protéines, soit un tiers de vos cibles journalières.
            </Text>
          ) : (
            <Text style={s.targetText}>
              Complétez votre profil (âge et objectifs) pour obtenir des portions adaptées. En attendant, 1 portion est proposée.
            </Text>
          )}
        </View>

        {/* Filtres */}
        <View style={s.filterCard}>
          <Text style={s.filterLabel}>Temps total disponible</Text>
          <View style={s.filterRow}>
            {[null, ...TIME_LIMITS].map((value) => (
              <TouchableOpacity
                key={String(value)}
                style={[s.filterBtn, minutes === value && s.filterBtnActive]}
                onPress={() => changeFilter(() => setMinutes(value))}
              >
                <Text style={[s.filterBtnText, minutes === value && { color: colors.white }]}>
                  {value ? `${value} min` : "Libre"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.filterLabel, { marginTop: 12 }]}>Aliments manquants autorisés</Text>
          <View style={s.filterRow}>
            {[-1, 0, 1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[s.filterBtn, filter === n && s.filterBtnActive]}
                onPress={() => changeFilter(() => setFilter(n))}
              >
                <Text style={[s.filterBtnText, filter === n && { color: colors.white }]}>{n < 0 ? "Tous" : n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <DinnerExclusions onChange={() => { setOffset(0); setRetry((r) => r + 1); }} />

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => { setOffset(0); setRetry((r) => r + 1); }}>
              <Text style={s.linkText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Content */}
        {loading && recipes.length === 0 ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={s.loadingText}>Recherche de recettes...</Text>
          </View>
        ) : !error && recipes.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="restaurant-outline" size={40} color={colors.gray[300]} />
            <Text style={s.emptyTitle}>Aucune recette trouvée</Text>
            <Text style={s.emptyHint}>Essayez un délai plus long, autorisez davantage d'aliments manquants ou retirez des ingrédients à éviter</Text>
          </View>
        ) : (
          <>
            {recipes.map((recipe) => {
              const servings = Math.max(recipe.servings || 1, 1);
              const chosen = parseDecimal(portions[recipe.id] ?? "");
              const valid = validPortions(chosen);
              const factor = valid ? chosen / recipe.suggested_portions : 1;
              const time = recipe.prep_time !== null && recipe.cook_time !== null ? recipe.prep_time + recipe.cook_time : null;
              const isOpen = expanded === recipe.id;
              return (
                <View key={recipe.id} style={s.recipeCard}>
                  <View style={s.recipeHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recipeName}>{recipe.name}</Text>
                      {recipe.description ? <Text style={s.recipeDesc}>{recipe.description}</Text> : null}
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

                  <View style={s.suggestedBox}>
                    <Text style={s.suggestedLabel}>
                      Conseillé : {formatNumber(recipe.suggested_portions, 2)} portion{recipe.suggested_portions > 1 ? "s" : ""}
                    </Text>
                    <View style={s.statsRow}>
                      <View style={s.stat}>
                        <Ionicons name="flame" size={14} color={colors.accent[500]} />
                        <Text style={s.statText}>
                          {valid ? Math.round((recipe.calories * chosen) / servings) : "–"} kcal ·{" "}
                          {valid ? Math.round((recipe.protein * chosen) / servings) : "–"} g de protéines
                        </Text>
                      </View>
                      {time !== null && time > 0 ? (
                        <View style={s.stat}>
                          <Ionicons name="time-outline" size={14} color={colors.gray[400]} />
                          <Text style={s.statText}>{time} min</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity style={s.detailsToggle} onPress={() => setExpanded(isOpen ? null : recipe.id)}>
                    <Text style={s.detailsToggleText}>Ingrédients et préparation</Text>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.gray[500]} />
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={s.details}>
                      <Text style={s.detailsHint}>
                        Quantités pour {valid ? formatNumber(chosen, 2) : formatNumber(recipe.suggested_portions, 2)} portion(s)
                      </Text>
                      {recipe.dinner_ingredients?.map((food) => (
                        <Text key={food.id} style={s.ingredient}>
                          • {food.name} · {formatNumber(food.quantity * factor, 2)} {food.unit}
                        </Text>
                      ))}
                      <Text style={s.instructions}>{recipe.instructions || "Préparation à compléter."}</Text>
                    </View>
                  )}

                  {recipe.missing_count > 0 && recipe.missing_ingredient_names?.length > 0 && (
                    <View style={s.missingBox}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <Ionicons name="alert-circle" size={14} color={colors.accent[600]} />
                        <Text style={s.missingTitle}>À compléter ou à vérifier pour la quantité conseillée :</Text>
                      </View>
                      <Text style={s.missingList}>{recipe.missing_ingredient_names.join(", ")}</Text>
                    </View>
                  )}

                  <View style={s.planRow}>
                    <PortionStepper
                      value={portions[recipe.id] ?? toInput(recipe.suggested_portions)}
                      onChange={(value) => setPortions((previous) => ({ ...previous, [recipe.id]: value }))}
                      min={0.25}
                      disabled={saving !== null}
                    />
                    <TouchableOpacity
                      style={[s.planBtn, (!valid || saving !== null) && { opacity: 0.5 }]}
                      disabled={!valid || saving !== null}
                      onPress={() => planDinner(recipe)}
                    >
                      {saving === recipe.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={s.planBtnText}>Prévoir ce soir</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={s.actions}>
              {hasMore ? (
                <TouchableOpacity style={s.actionBtn} onPress={() => setOffset((o) => o + 10)} disabled={loading}>
                  {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.actionBtnText}>Voir plus de recettes</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.reloadBtn} onPress={() => { setOffset(0); setRetry((r) => r + 1); }}>
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
  filterRow: { flexDirection: "row", gap: 6 },
  filterBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.gray[100], alignItems: "center" },
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
  targetCard: { marginHorizontal: 20, marginTop: 8, flexDirection: "row", gap: 8, backgroundColor: colors.primary[50], borderRadius: 14, padding: 12 },
  targetText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.gray[700] },
  targetBold: { fontWeight: "700", color: colors.primary[700] },
  errorBox: { marginHorizontal: 20, marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.red[50], borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13, color: colors.red[600], flex: 1 },
  linkText: { fontSize: 13, fontWeight: "700", color: colors.primary[600] },
  suggestedBox: { marginTop: 12, backgroundColor: colors.gray[50], borderRadius: 10, padding: 10 },
  suggestedLabel: { fontSize: 12, fontWeight: "700", color: colors.primary[700] },
  detailsToggle: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  detailsToggleText: { fontSize: 13, fontWeight: "600", color: colors.gray[700] },
  details: { paddingTop: 4, gap: 3 },
  detailsHint: { fontSize: 11, color: colors.gray[500], marginBottom: 2 },
  ingredient: { fontSize: 13, color: colors.gray[700] },
  instructions: { marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.gray[600] },
  planRow: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  planBtn: { backgroundColor: colors.primary[600], borderRadius: 10, height: 36, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", minWidth: 120 },
  planBtnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
});
