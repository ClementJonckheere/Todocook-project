import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, apiUrl } from "../src/lib/api";
import { colors } from "../src/theme/colors";

interface Recipe {
  id: number;
  name: string;
  servings: number;
  calories: number;
  is_public: boolean;
  created_by: number | null;
  ingredient_names: string | null;
}

/** Confirmation (Alert n'affiche rien sur la cible web d'Expo). */
function confirm(message: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(message) ?? false);
  return new Promise((resolve) =>
    Alert.alert("Supprimer la recette", message, [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: "Supprimer", style: "destructive", onPress: () => resolve(true) },
    ])
  );
}

/** Recettes créées par l'utilisateur : modification et suppression. */
export default function MesRecettesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [meRes, listRes] = await Promise.all([
        apiRequest(apiUrl("/api/users")),
        apiRequest(apiUrl("/api/recipes?onlyUser=true")),
      ]);
      const me = await meRes.json();
      const list: Recipe[] = await listRes.json();
      setRecipes(Array.isArray(list) ? list.filter((recipe) => recipe.created_by === me.id) : []);
    } catch {
      setRecipes([]);
      setMessage("Impossible de charger vos recettes.");
    }
  }, []);

  // Recharge au retour de l'écran de modification
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (recipe: Recipe) => {
    if (!(await confirm(`Supprimer « ${recipe.name} » ?`))) return;
    const res = await apiRequest(apiUrl(`/api/recipes/${recipe.id}`), { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `« ${recipe.name} » supprimée.` : data.error || "Suppression impossible.");
    if (res.ok) load();
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={22} color={colors.gray[600]} />
          </TouchableOpacity>
          <Text style={s.title}>Mes recettes</Text>
          <TouchableOpacity style={s.createBtn} onPress={() => router.push("/creation-recette")}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={s.createText}>Créer</Text>
          </TouchableOpacity>
        </View>

        {message ? <Text style={s.message}>{message}</Text> : null}

        {recipes === null ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary[500]} />
        ) : recipes.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="book-outline" size={32} color={colors.gray[300]} />
            <Text style={s.emptyText}>Vous n'avez pas encore créé de recette.</Text>
          </View>
        ) : (
          recipes.map((recipe) => (
            <View key={recipe.id} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{recipe.name}</Text>
                <Text style={s.meta}>
                  {Math.round(recipe.calories / Math.max(recipe.servings, 1))} kcal / portion · {recipe.servings} portion(s)
                  {recipe.is_public ? " · publique" : " · privée"}
                </Text>
                {recipe.ingredient_names ? <Text style={s.ingredients} numberOfLines={1}>{recipe.ingredient_names}</Text> : null}
              </View>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => router.push({ pathname: "/creation-recette", params: { id: String(recipe.id) } })}
                accessibilityLabel={`Modifier ${recipe.name}`}
              >
                <Ionicons name="create-outline" size={20} color={colors.gray[700]} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.iconBtn, s.iconDanger]} onPress={() => remove(recipe)} accessibilityLabel={`Supprimer ${recipe.name}`}>
                <Ionicons name="trash-outline" size={20} color={colors.red[600]} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray[100], justifyContent: "center", alignItems: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "bold", color: colors.gray[900] },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary[500], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  createText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  message: { marginHorizontal: 20, marginTop: 8, fontSize: 13, color: colors.gray[600] },
  empty: { marginHorizontal: 20, marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: colors.gray[500] },
  card: {
    marginHorizontal: 20, marginTop: 10, backgroundColor: colors.white, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.gray[900] },
  meta: { fontSize: 12, color: colors.gray[500], marginTop: 3 },
  ingredients: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.gray[100], alignItems: "center", justifyContent: "center" },
  iconDanger: { backgroundColor: colors.red[50] },
});
