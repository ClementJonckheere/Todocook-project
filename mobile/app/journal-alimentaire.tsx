import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { addDays, format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { apiRequest, apiUrl } from "../src/lib/api";
import {
  MEAL_LABELS,
  MEAL_TYPES,
  type MealType,
  foodLabel,
  formatNumber,
  hasNutrition,
  shownValue,
  parseDecimal,
  per100g,
  validFoodAmount,
} from "../src/lib/food-journal";
import { colors } from "../src/theme/colors";

interface Food {
  id: number;
  name: string;
  brand: string | null;
  // null : valeur inconnue (produit scanné incomplet sur Open Food Facts)
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface Entry {
  id: number;
  name: string;
  brand: string | null;
  grams: number;
  meal_type: MealType;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
}

interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MEAL_ICONS: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  "petit-dejeuner": "sunny-outline",
  dejeuner: "restaurant-outline",
  diner: "moon-outline",
  collation: "cafe-outline",
};

/** Repas proposé par défaut selon l'heure de la saisie. */
function mealForNow(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return "petit-dejeuner";
  if (hour < 15) return "dejeuner";
  if (hour < 18) return "collation";
  return "diner";
}

function dayLabel(day: string, today: string): string {
  if (day === today) return "Aujourd'hui";
  if (day === format(addDays(parseISO(today), -1), "yyyy-MM-dd")) return "Hier";
  return format(parseISO(day), "EEEE d MMMM", { locale: fr });
}

export default function JournalAlimentaireScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; aliment?: string }>();
  const today = format(new Date(), "yyyy-MM-dd");
  const initialDay = params.date && isValid(parseISO(params.date)) && params.date <= today ? params.date : today;

  const [day, setDay] = useState(initialDay);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totals, setTotals] = useState<DayTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState(false);

  const [food, setFood] = useState<Food | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Food[]>([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [amount, setAmount] = useState("100");
  const [meal, setMeal] = useState<MealType>(mealForNow());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // Clé d'idempotence : un nouvel envoi après une coupure réseau ne crée pas de doublon.
  const entryKey = useRef("");
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(async () => {
    setListError(false);
    try {
      const [journalRes, totalsRes] = await Promise.all([
        apiRequest(apiUrl(`/api/food-journal?date=${day}`)),
        apiRequest(apiUrl(`/api/daily-logs?date=${day}`)),
      ]);
      if (!journalRes.ok) throw new Error();
      setEntries(await journalRes.json());
      const totalsData = totalsRes.ok ? await totalsRes.json() : [];
      setTotals(Array.isArray(totalsData) && totalsData[0] ? totalsData[0] : null);
    } catch {
      setListError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [day]);

  // Recharge à chaque retour sur l'écran (ex. après un scan)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Aliment transmis par le scanner
  useEffect(() => {
    const id = Number(params.aliment);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    let cancelled = false;
    apiRequest(apiUrl(`/api/ingredients?id=${id}`))
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Food[]) => {
        if (!cancelled && rows[0]) {
          setEditing(null);
          setFood(rows[0]);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [params.aliment]);

  // Recherche dans le catalogue, avec un léger délai pendant la frappe
  useEffect(() => {
    const term = search.trim();
    setMatches([]);
    setSearchStatus("");
    if (term.length < 2 || food || editing) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(apiUrl(`/api/ingredients?search=${encodeURIComponent(term)}`));
        if (!res.ok) throw new Error();
        const data: Food[] = await res.json();
        if (cancelled) return;
        setMatches(data);
        if (!data.length) setSearchStatus("Aucun aliment trouvé. Vous pouvez aussi scanner son code-barres.");
      } catch {
        if (!cancelled) setSearchStatus("Recherche indisponible. Réessayez.");
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, food, editing]);

  const clearForm = () => {
    setEditing(null);
    setFood(null);
    setSearch("");
    setAmount("100");
    setMeal(mealForNow());
    entryKey.current = "";
  };

  const changeDay = (delta: number) => {
    const next = format(addDays(parseISO(day), delta), "yyyy-MM-dd");
    if (next > today) return;
    clearForm();
    setMessage("");
    setLoading(true);
    setDay(next);
  };

  const grams = parseDecimal(amount);
  const selected = editing ?? food;
  // Produit scanné sans valeurs nutritionnelles complètes : il compterait pour 0 kcal
  const unknownNutrition = Boolean(food && !editing && !hasNutrition(food));
  const calories100 = editing?.calories_100g ?? food?.calories ?? 0;
  const protein100 = editing?.protein_100g ?? food?.protein ?? 0;

  const save = async () => {
    if (busy || !selected || unknownNutrition || !validFoodAmount(grams)) return;
    setBusy(true);
    setMessage("");
    try {
      if (!editing && !entryKey.current) entryKey.current = Crypto.randomUUID();
      const target = editing
        ? { id: editing.id }
        : { ingredient_id: food!.id, entry_key: entryKey.current, date: day };
      const res = await apiRequest(apiUrl("/api/food-journal"), {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ ...target, grams, meal_type: meal }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
      setMessage(editing ? "Quantité et repas mis à jour." : "Aliment ajouté au journal.");
      clearForm();
      load();
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "Enregistrement impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async (entry: Entry) => {
    setBusy(true);
    try {
      const res = await apiRequest(apiUrl(`/api/food-journal?id=${entry.id}`), { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (editing?.id === entry.id) clearForm();
      setMessage("Aliment supprimé.");
      load();
    } catch {
      setMessage("Suppression impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (entry: Entry) => {
    // Alert.alert n'affiche rien sur la cible web d'Expo
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(`Supprimer « ${foodLabel(entry)} » du journal ?`)) deleteEntry(entry);
      return;
    }
    Alert.alert("Supprimer cet aliment ?", foodLabel(entry), [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => deleteEntry(entry) },
    ]);
  };

  const startEdit = (entry: Entry) => {
    setFood(null);
    setEditing(entry);
    setAmount(String(entry.grams).replace(".", ","));
    setMeal(entry.meal_type);
    setMessage("");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const journalCalories = entries.reduce((sum, e) => sum + per100g(e.calories_100g, e.grams), 0);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityLabel="Retour">
              <Ionicons name="arrow-back" size={22} color={colors.gray[600]} />
            </TouchableOpacity>
            <View>
              <Text style={s.title}>Journal alimentaire</Text>
              <Text style={s.subtitle}>Ce que vous avez réellement mangé</Text>
            </View>
          </View>

          {/* Choix du jour */}
          <View style={s.dayNav}>
            <TouchableOpacity onPress={() => changeDay(-1)} style={s.navBtn} accessibilityLabel="Jour précédent">
              <Ionicons name="chevron-back" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={s.dayLabel}>{dayLabel(day, today)}</Text>
            <TouchableOpacity
              onPress={() => changeDay(1)}
              style={[s.navBtn, day >= today && s.disabled]}
              disabled={day >= today}
              accessibilityLabel="Jour suivant"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Totaux du jour : repas planifiés consommés + aliments du journal */}
          <View style={s.totalsCard}>
            <View style={s.totalItem}>
              <Text style={s.totalValue}>{Math.round(totals?.calories ?? 0)}</Text>
              <Text style={s.totalLabel}>kcal</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalItem}>
              <Text style={s.totalValue}>{Math.round(totals?.protein ?? 0)}g</Text>
              <Text style={s.totalLabel}>Protéines</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalItem}>
              <Text style={s.totalValue}>{Math.round(totals?.carbs ?? 0)}g</Text>
              <Text style={s.totalLabel}>Glucides</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalItem}>
              <Text style={s.totalValue}>{Math.round(totals?.fat ?? 0)}g</Text>
              <Text style={s.totalLabel}>Lipides</Text>
            </View>
          </View>
          <Text style={s.totalsHint}>Total du jour : repas du planning marqués comme mangés + aliments ci-dessous.</Text>

          {/* Formulaire d'ajout / de modification */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{editing ? "Modifier la saisie" : "Ajouter un aliment"}</Text>

            {selected ? (
              <>
                <View style={s.selectedRow}>
                  <Text style={s.selectedName} numberOfLines={2}>{foodLabel(selected)}</Text>
                  <TouchableOpacity onPress={clearForm} disabled={busy} hitSlop={8}>
                    <Text style={s.link}>{editing ? "Annuler" : "Changer"}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.fieldLabel}>Quantité mangée</Text>
                <View style={s.gramsRow}>
                  <TextInput
                    style={s.gramsInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    editable={!busy}
                    accessibilityLabel="Quantité en grammes"
                  />
                  <Text style={s.gramsUnit}>g</Text>
                  {[50, 100, 150, 200].map((preset) => (
                    <TouchableOpacity key={preset} style={s.preset} onPress={() => setAmount(String(preset))} disabled={busy}>
                      <Text style={s.presetText}>{preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.fieldLabel}>Repas</Text>
                <View style={s.mealRow}>
                  {MEAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[s.mealChip, meal === type && s.mealChipActive]}
                      onPress={() => setMeal(type)}
                      disabled={busy}
                    >
                      <Ionicons name={MEAL_ICONS[type]} size={14} color={meal === type ? colors.white : colors.gray[500]} />
                      <Text style={[s.mealChipText, meal === type && { color: colors.white }]}>{MEAL_LABELS[type]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {unknownNutrition ? (
                  <Text style={s.errorText}>
                    Valeurs nutritionnelles inconnues pour ce produit : il ne peut pas être ajouté au journal.
                  </Text>
                ) : validFoodAmount(grams) ? (
                  <Text style={s.preview}>
                    {Math.round(per100g(calories100, grams))} kcal · {formatNumber(per100g(protein100, grams))} g de protéines
                  </Text>
                ) : (
                  <Text style={s.errorText}>Saisissez une quantité entre 0 et 10 000 g.</Text>
                )}

                <TouchableOpacity
                  style={[s.primaryBtn, (busy || unknownNutrition || !validFoodAmount(grams)) && s.disabled]}
                  disabled={busy || unknownNutrition || !validFoodAmount(grams)}
                  onPress={save}
                >
                  {busy ? <ActivityIndicator color={colors.white} /> : (
                    <Text style={s.primaryBtnText}>{editing ? "Enregistrer la modification" : "Ajouter au journal"}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={s.searchRow}>
                  <Ionicons name="search" size={18} color={colors.gray[400]} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Nom d'un aliment ou marque"
                    placeholderTextColor={colors.gray[400]}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch("")} accessibilityLabel="Effacer la recherche">
                      <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {searchStatus ? <Text style={s.hint}>{searchStatus}</Text> : null}
                {matches.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.match}
                    onPress={() => { setFood(item); setSearch(""); setMessage(""); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.matchName}>{foodLabel(item)}</Text>
                      <Text style={s.matchMeta}>{shownValue(item.calories)} kcal / 100 g</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={colors.primary[400]} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={s.scanBtn}
                  onPress={() => router.push({ pathname: "/scanner", params: { date: day } })}
                >
                  <Ionicons name="scan-outline" size={18} color={colors.primary[600]} />
                  <Text style={s.scanBtnText}>Scanner un produit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {message ? <Text style={s.message}>{message}</Text> : null}

          {/* Aliments du jour */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Aliments saisis</Text>
            {entries.length > 0 && <Text style={s.sectionCount}>{Math.round(journalCalories)} kcal</Text>}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary[500]} />
          ) : listError ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>Journal indisponible</Text>
              <TouchableOpacity onPress={() => { setLoading(true); load(); }}>
                <Text style={s.link}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : entries.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="nutrition-outline" size={32} color={colors.gray[300]} />
              <Text style={s.emptyTitle}>Aucun aliment saisi pour ce jour</Text>
            </View>
          ) : (
            MEAL_TYPES.filter((type) => entries.some((e) => e.meal_type === type)).map((type) => (
              <View key={type}>
                <Text style={s.mealGroup}>{MEAL_LABELS[type]}</Text>
                {entries.filter((e) => e.meal_type === type).map((entry) => (
                  <View key={entry.id} style={[s.entry, editing?.id === entry.id && s.entryEditing]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.entryName}>{foodLabel(entry)}</Text>
                      <Text style={s.entryMeta}>
                        {formatNumber(entry.grams)} g · {Math.round(per100g(entry.calories_100g, entry.grams))} kcal ·{" "}
                        {formatNumber(per100g(entry.protein_100g, entry.grams))} g prot.
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => startEdit(entry)} disabled={busy} hitSlop={8} accessibilityLabel="Modifier">
                      <Ionicons name="create-outline" size={20} color={colors.gray[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(entry)} disabled={busy} hitSlop={8} accessibilityLabel="Supprimer">
                      <Ionicons name="trash-outline" size={20} color={colors.gray[400]} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const card = {
  marginHorizontal: 20,
  backgroundColor: colors.white,
  borderRadius: 16,
  shadowColor: "#000",
  shadowOpacity: 0.03,
  shadowRadius: 4,
  elevation: 1,
} as const;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray[100], justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", color: colors.gray[900] },
  subtitle: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, marginTop: 8 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  dayLabel: { fontSize: 15, fontWeight: "700", color: colors.gray[800], textTransform: "capitalize" },
  totalsCard: { ...card, marginTop: 12, flexDirection: "row", paddingVertical: 14 },
  totalItem: { flex: 1, alignItems: "center" },
  totalValue: { fontSize: 17, fontWeight: "800", color: colors.gray[900] },
  totalLabel: { fontSize: 11, color: colors.gray[500], marginTop: 2 },
  totalDivider: { width: 1, backgroundColor: colors.gray[100] },
  totalsHint: { marginHorizontal: 24, marginTop: 6, fontSize: 11, color: colors.gray[400] },
  card: { ...card, marginTop: 16, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.gray[900], marginBottom: 10 },
  selectedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  selectedName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.gray[800] },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.gray[500], marginTop: 14, marginBottom: 6 },
  gramsRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  gramsInput: {
    width: 80, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.gray[200],
    textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.gray[900],
  },
  gramsUnit: { fontSize: 14, color: colors.gray[500], marginRight: 4 },
  preset: { paddingHorizontal: 10, height: 32, borderRadius: 8, backgroundColor: colors.gray[100], justifyContent: "center" },
  presetText: { fontSize: 12, fontWeight: "600", color: colors.gray[600] },
  mealRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  mealChip: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: colors.gray[200],
  },
  mealChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  mealChipText: { fontSize: 12, fontWeight: "600", color: colors.gray[600] },
  preview: { marginTop: 12, fontSize: 13, color: colors.gray[700], fontWeight: "600" },
  errorText: { marginTop: 12, fontSize: 12, color: colors.red[600] },
  primaryBtn: { marginTop: 12, backgroundColor: colors.primary[500], borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  link: { fontSize: 13, color: colors.primary[600], fontWeight: "600" },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: colors.gray[50],
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.gray[900] },
  hint: { marginTop: 8, fontSize: 12, color: colors.gray[500] },
  match: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  matchName: { fontSize: 14, fontWeight: "600", color: colors.gray[800] },
  matchMeta: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  scanBtn: {
    marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200],
  },
  scanBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary[600] },
  message: { marginHorizontal: 24, marginTop: 10, fontSize: 13, color: colors.gray[600] },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginTop: 22, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.gray[900] },
  sectionCount: { fontSize: 13, fontWeight: "600", color: colors.gray[500] },
  mealGroup: { marginHorizontal: 24, marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: "700", color: colors.gray[500], textTransform: "uppercase" },
  entry: { ...card, marginBottom: 8, padding: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  entryEditing: { borderWidth: 1, borderColor: colors.primary[300] },
  entryName: { fontSize: 14, fontWeight: "600", color: colors.gray[800] },
  entryMeta: { fontSize: 12, color: colors.gray[500], marginTop: 3 },
  emptyCard: { ...card, marginTop: 8, padding: 28, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: colors.gray[500] },
});
