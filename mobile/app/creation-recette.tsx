import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl, getHeaders, apiRequest } from "../src/lib/api";
import { colors } from "../src/theme/colors";
import { gramsPerUnit } from "../src/lib/recipe-portions";

interface Ingredient {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Unité de référence de l'ingrédient dans le catalogue */
  unit: string;
  barcode?: string | null;
}

interface SelectedIngredient extends Ingredient {
  quantity: number;
  /** Unité de la quantité dans la recette (g pour un ajout ; conservée en modification) */
  recipeUnit: string;
}

/** Ligne d'ingrédient renvoyée par GET /api/recipes/[id] */
interface StoredIngredient {
  ingredient_id: number;
  quantity: number;
  unit: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredient_unit: string;
  barcode: string | null;
}

const step = (unit: string) => (unit === "pièce" ? 1 : unit === "ml" ? 5 : 10);
/** Grammes représentés par une ligne (0 si l'unité n'est pas convertible) */
const gramsOf = (ing: SelectedIngredient) => ing.quantity * (gramsPerUnit(ing, ing.recipeUnit) ?? 0);

export default function CreationRecetteScreen() {
  const router = useRouter();
  // Avec ?id=, l'écran modifie une recette existante de l'utilisateur
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const [loading, setLoading] = useState(Boolean(editId));
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("4");
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest(apiUrl(`/api/recipes/${encodeURIComponent(editId)}`));
        const recipe = await res.json();
        if (!res.ok) throw new Error(recipe.error || "Recette introuvable.");
        if (!recipe.is_owner) throw new Error("Seule la personne qui a créé cette recette peut la modifier.");
        if (cancelled) return;
        setName(recipe.name ?? "");
        setDescription(recipe.description ?? "");
        setInstructions(recipe.instructions ?? "");
        setPrepTime(recipe.prep_time != null ? String(recipe.prep_time) : "");
        setCookTime(recipe.cook_time != null ? String(recipe.cook_time) : "");
        setServings(String(recipe.servings ?? 1));
        setIngredients((recipe.ingredients as StoredIngredient[]).map((line) => ({
          id: line.ingredient_id, name: line.name, calories: line.calories, protein: line.protein,
          carbs: line.carbs, fat: line.fat, unit: line.ingredient_unit, barcode: line.barcode,
          quantity: line.quantity, recipeUnit: line.unit,
        })));
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Recette introuvable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiRequest(apiUrl(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`), { headers: getHeaders() });
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

  const addIngredient = (ing: Ingredient) => {
    if (ingredients.find((i) => i.id === ing.id)) return;
    // Nouvel ingrédient : quantité en grammes (toujours convertible)
    setIngredients([...ingredients, { ...ing, quantity: 100, recipeUnit: "g" }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (id: number, delta: number) => {
    setIngredients(
      ingredients.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(step(i.recipeUnit), i.quantity + delta * step(i.recipeUnit)) } : i
      )
    );
  };

  const removeIngredient = (id: number) => {
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  // Live nutrition calculation
  const totalNutrition = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories * gramsOf(ing)) / 100,
      protein: acc.protein + (ing.protein * gramsOf(ing)) / 100,
      carbs: acc.carbs + (ing.carbs * gramsOf(ing)) / 100,
      fat: acc.fat + (ing.fat * gramsOf(ing)) / 100,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const saveRecipe = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom de la recette est requis.");
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert("Erreur", "Ajoutez au moins un ingrédient.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest(apiUrl(editId ? `/api/recipes/${encodeURIComponent(editId)}` : "/api/recipes"), {
        method: editId ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          prep_time: prepTime ? parseInt(prepTime) || 0 : null,
          cook_time: cookTime ? parseInt(cookTime) || 0 : null,
          servings: parseInt(servings) || 1,
          // En modification, la visibilité actuelle est conservée
          ...(editId ? {} : { is_public: false }),
          ingredients: ingredients.map((i) => ({
            ingredient_id: i.id,
            quantity: i.quantity,
            unit: i.recipeUnit,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Vérifiez les quantités et les portions.");
      }
      Alert.alert(editId ? "Recette modifiée" : "Recette créée", "Votre recette a été sauvegardée.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      if (Platform.OS === "web") router.back(); // Alert n'a pas de bouton sur la cible web d'Expo
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error && error.message ? error.message : "Impossible de sauvegarder la recette.");
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={s.title}>{editId ? "Modifier la recette" : "Nouvelle recette"}</Text>
          </View>

          {loadError ? (
            <Text style={s.loadError}>{loadError}</Text>
          ) : loading ? (
            <Text style={s.loadingText}>Chargement de la recette…</Text>
          ) : (
          <>
          {/* Form */}
          <View style={s.formCard}>
            <Text style={s.label}>Nom de la recette *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex: Salade César" />

            <Text style={s.label}>Description</Text>
            <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="Description courte" />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Préparation (min)</Text>
                <TextInput style={s.input} value={prepTime} onChangeText={setPrepTime} keyboardType="numeric" placeholder="15" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Cuisson (min)</Text>
                <TextInput style={s.input} value={cookTime} onChangeText={setCookTime} keyboardType="numeric" placeholder="30" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Portions</Text>
                <TextInput style={s.input} value={servings} onChangeText={setServings} keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <View style={s.formCard}>
            <Text style={s.sectionLabel}>Ingrédients</Text>
            <TextInput
              style={s.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher un ingrédient..."
            />

            {searchResults.map((ing) => (
              <TouchableOpacity key={ing.id} style={s.searchResult} onPress={() => addIngredient(ing)}>
                <Text style={s.searchResultName}>{ing.name}</Text>
                <Text style={s.searchResultCal}>{ing.calories} kcal/100g</Text>
              </TouchableOpacity>
            ))}

            {ingredients.map((ing) => (
              <View key={ing.id} style={s.ingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.ingName}>{ing.name}</Text>
                  <Text style={s.ingCal}>{Math.round((ing.calories * gramsOf(ing)) / 100)} kcal</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQuantity(ing.id, -1)} accessibilityLabel="Moins">
                    <Text style={s.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyValue}>{ing.quantity} {ing.recipeUnit}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQuantity(ing.id, 1)} accessibilityLabel="Plus">
                    <Text style={s.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeIngredient(ing.id)} style={{ marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={colors.red[400]} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Nutrition summary */}
          {ingredients.length > 0 && (
            <View style={s.nutritionCard}>
              <Text style={s.nutritionTitle}>Valeurs nutritionnelles totales</Text>
              <View style={s.nutritionGrid}>
                <View style={s.nutritionItem}>
                  <Text style={s.nutritionValue}>{Math.round(totalNutrition.calories)}</Text>
                  <Text style={s.nutritionLabel}>kcal</Text>
                </View>
                <View style={s.nutritionItem}>
                  <Text style={s.nutritionValue}>{Math.round(totalNutrition.protein)}g</Text>
                  <Text style={s.nutritionLabel}>Protéines</Text>
                </View>
                <View style={s.nutritionItem}>
                  <Text style={s.nutritionValue}>{Math.round(totalNutrition.carbs)}g</Text>
                  <Text style={s.nutritionLabel}>Glucides</Text>
                </View>
                <View style={s.nutritionItem}>
                  <Text style={s.nutritionValue}>{Math.round(totalNutrition.fat)}g</Text>
                  <Text style={s.nutritionLabel}>Lipides</Text>
                </View>
              </View>
            </View>
          )}

          {/* Instructions */}
          <View style={s.formCard}>
            <Text style={s.label}>Instructions</Text>
            <TextInput
              style={[s.input, { height: 120, textAlignVertical: "top" }]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Décrivez les étapes de préparation..."
              multiline
            />
          </View>

          {/* Save button */}
          <TouchableOpacity style={s.saveBtn} onPress={saveRecipe} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? "Sauvegarde..." : editId ? "Enregistrer les modifications" : "Sauvegarder la recette"}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray[100], justifyContent: "center", alignItems: "center" },
  loadError: { marginHorizontal: 20, marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: colors.red[50], color: colors.red[600], fontSize: 14 },
  loadingText: { marginHorizontal: 20, marginTop: 16, color: colors.gray[500], fontSize: 14 },
  title: { fontSize: 20, fontWeight: "bold", color: colors.gray[900] },
  formCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  label: { fontSize: 12, fontWeight: "600", color: colors.gray[500], marginBottom: 6, marginTop: 8 },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: colors.gray[900], marginBottom: 12 },
  input: { backgroundColor: colors.gray[50], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, borderWidth: 1, borderColor: colors.gray[200], marginBottom: 4 },
  row: { flexDirection: "row", gap: 10 },
  searchResult: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  searchResultName: { fontSize: 14, color: colors.gray[900] },
  searchResultCal: { fontSize: 12, color: colors.accent[500] },
  ingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  ingName: { fontSize: 13, fontWeight: "600", color: colors.gray[900] },
  ingCal: { fontSize: 11, color: colors.gray[500] },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.gray[100], justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 16, fontWeight: "bold", color: colors.gray[700] },
  qtyValue: { fontSize: 13, fontWeight: "600", color: colors.gray[900], minWidth: 40, textAlign: "center" },
  nutritionCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.primary[50], borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary[200] },
  nutritionTitle: { fontSize: 13, fontWeight: "700", color: colors.primary[700], marginBottom: 12 },
  nutritionGrid: { flexDirection: "row", justifyContent: "space-around" },
  nutritionItem: { alignItems: "center" },
  nutritionValue: { fontSize: 16, fontWeight: "bold", color: colors.gray[900] },
  nutritionLabel: { fontSize: 10, color: colors.gray[500], marginTop: 2 },
  saveBtn: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.primary[500], borderRadius: 14, paddingVertical: 16, alignItems: "center", shadowColor: colors.primary[500], shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
