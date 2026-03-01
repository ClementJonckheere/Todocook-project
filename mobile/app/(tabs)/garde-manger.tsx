import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl, getHeaders } from "../../src/lib/api";
import { colors } from "../../src/theme/colors";

interface PantryItem {
  id: number;
  name: string;
  calories: number;
  category: string;
  quantity: number;
  unit: string;
}

interface MissingIngredient {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  recipe_name: string;
}

export default function GardeMangerScreen() {
  const router = useRouter();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [missingItems, setMissingItems] = useState<MissingIngredient[]>([]);
  const [tab, setTab] = useState<"pantry" | "missing">("pantry");
  const [filterMissing, setFilterMissing] = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  const loadData = async () => {
    try {
      const [pantryRes, missingRes] = await Promise.all([
        fetch(apiUrl("/api/pantry?userId=1"), { headers: getHeaders() }),
        fetch(apiUrl("/api/pantry/missing?userId=1"), { headers: getHeaders() }),
      ]);

      // Check if responses are ok
      if (!pantryRes.ok || !missingRes.ok) {
        console.error("API error:", pantryRes.status, missingRes.status);
        return;
      }

      const pantryData = await pantryRes.json();
      const missingData = await missingRes.json();

      // Ensure we have arrays
      setPantryItems(Array.isArray(pantryData) ? pantryData : []);
      setMissingItems(Array.isArray(missingData) ? missingData : []);
    } catch (err) {
      console.error("Load data error:", err);
      // Keep empty arrays on error
      setPantryItems([]);
      setMissingItems([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const removeItem = async (id: number) => {
    try {
      await fetch(apiUrl(`/api/pantry?id=${id}`), { method: "DELETE", headers: getHeaders() });
      loadData();
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer.");
    }
  };

  // Group pantry by category
  const grouped = pantryItems.reduce((acc, item) => {
    const cat = item.category || "Autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  // Group missing by recipe
  const missingByRecipe = missingItems.reduce((acc, item) => {
    if (!acc[item.recipe_name]) acc[item.recipe_name] = [];
    acc[item.recipe_name].push(item);
    return acc;
  }, {} as Record<string, MissingIngredient[]>);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Garde-manger</Text>
          <Text style={s.subtitle}>{pantryItems.length} aliments</Text>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, tab === "pantry" && s.tabActive]}
            onPress={() => setTab("pantry")}
          >
            <Text style={[s.tabText, tab === "pantry" && s.tabTextActive]}>Mes aliments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === "missing" && s.tabMissingActive]}
            onPress={() => setTab("missing")}
          >
            <Text style={[s.tabText, tab === "missing" && s.tabTextActive]}>Manquants</Text>
            {missingItems.length > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{missingItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Recipe suggestions */}
        <View style={s.suggestCard}>
          <View style={s.suggestHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="bulb-outline" size={20} color={colors.primary[600]} />
              <Text style={s.suggestTitle}>Suggestions de recettes</Text>
            </View>
            <TouchableOpacity onPress={() => setShowFilter(!showFilter)}>
              <Ionicons name="options-outline" size={20} color={colors.primary[600]} />
            </TouchableOpacity>
          </View>

          {showFilter && (
            <View style={s.filterRow}>
              <Text style={s.filterLabel}>Aliments manquants autorisés :</Text>
              <View style={s.filterBtns}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[s.filterBtn, filterMissing === n && s.filterBtnActive]}
                    onPress={() => setFilterMissing(n)}
                  >
                    <Text style={[s.filterBtnText, filterMissing === n && { color: colors.white }]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={s.suggestBtn}
            onPress={() =>
              router.push({ pathname: "/suggestions-recettes", params: { maxMissing: String(filterMissing) } })
            }
          >
            <Text style={s.suggestBtnText}>
              Voir les recettes ({filterMissing} manquant{filterMissing !== 1 ? "s" : ""} max)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {tab === "pantry" ? (
          Object.keys(grouped).length > 0 ? (
            Object.entries(grouped).map(([category, items]) => (
              <View key={category} style={s.group}>
                <Text style={s.groupTitle}>{category}</Text>
                <View style={s.groupCard}>
                  {items.map((item, idx) => (
                    <View
                      key={item.id}
                      style={[s.itemRow, idx < items.length - 1 && s.itemBorder]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemName}>{item.name}</Text>
                        <Text style={s.itemInfo}>
                          {item.quantity} {item.unit} · {item.calories} kcal/100g
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeItem(item.id)}>
                        <Ionicons name="trash-outline" size={18} color={colors.red[400]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="basket-outline" size={36} color={colors.gray[300]} />
              <Text style={s.emptyText}>Votre garde-manger est vide</Text>
              <Text style={s.emptyHint}>Utilisez le scanner pour ajouter des produits</Text>
            </View>
          )
        ) : Object.keys(missingByRecipe).length > 0 ? (
          Object.entries(missingByRecipe).map(([recipeName, items]) => (
            <View key={recipeName} style={s.group}>
              <Text style={s.groupTitle}>Pour : {recipeName}</Text>
              <View style={s.groupCard}>
                {items.map((item, idx) => (
                  <View key={`${item.id}-${idx}`} style={[s.itemRow, idx < items.length - 1 && s.itemBorder]}>
                    <Ionicons name="alert-circle" size={16} color={colors.accent[500]} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.name}</Text>
                      <Text style={s.itemInfo}>{item.quantity} {item.unit}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle" size={36} color={colors.primary[500]} />
            <Text style={[s.emptyText, { color: colors.primary[600] }]}>
              Vous avez tout ce qu'il vous faut !
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: "bold", color: colors.gray[900] },
  subtitle: { fontSize: 14, color: colors.gray[500], marginTop: 2 },
  tabRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.gray[100], alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 },
  tabActive: { backgroundColor: colors.primary[500] },
  tabMissingActive: { backgroundColor: colors.accent[500] },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  tabTextActive: { color: colors.white },
  badge: { backgroundColor: colors.red[500], width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "bold" },
  suggestCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.primary[50], borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary[200] },
  suggestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  suggestTitle: { fontSize: 13, fontWeight: "600", color: colors.primary[700] },
  filterRow: { marginTop: 12 },
  filterLabel: { fontSize: 11, color: colors.primary[600], marginBottom: 8 },
  filterBtns: { flexDirection: "row", gap: 8 },
  filterBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.gray[200], backgroundColor: colors.white, justifyContent: "center", alignItems: "center" },
  filterBtnActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  suggestBtn: { backgroundColor: colors.primary[500], borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 12 },
  suggestBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  group: { marginHorizontal: 20, marginTop: 16 },
  groupTitle: { fontSize: 12, fontWeight: "600", color: colors.gray[500], marginBottom: 6 },
  groupCard: { backgroundColor: colors.white, borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.gray[900] },
  itemInfo: { fontSize: 11, color: colors.gray[500], marginTop: 2 },
  emptyCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.white, borderRadius: 16, padding: 32, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.gray[500], marginTop: 8 },
  emptyHint: { fontSize: 12, color: colors.gray[400], marginTop: 4 },
});
