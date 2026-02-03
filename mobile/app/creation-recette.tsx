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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl } from "../src/lib/api";
import { colors } from "../src/theme/colors";

interface Ingredient {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

interface SelectedIngredient extends Ingredient {
  quantity: number;
}

export default function CreationRecetteScreen() {
  const router = useRouter();
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
    if (searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(apiUrl(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`));
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
    setIngredients([...ingredients, { ...ing, quantity: 100 }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (id: number, delta: number) => {
    setIngredients(
      ingredients.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(10, i.quantity + delta) } : i
      )
    );
  };

  const removeIngredient = (id: number) => {
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  // Live nutrition calculation
  const totalNutrition = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories * ing.quantity) / 100,
      protein: acc.protein + (ing.protein * ing.quantity) / 100,
      carbs: acc.carbs + (ing.carbs * ing.quantity) / 100,
      fat: acc.fat + (ing.fat * ing.quantity) / 100,
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
      await fetch(apiUrl("/api/recipes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          prep_time: parseInt(prepTime) || 0,
          cook_time: parseInt(cookTime) || 0,
          servings: parseInt(servings) || 4,
          created_by: 1,
          is_public: false,
          ingredients: ingredients.map((i) => ({
            ingredient_id: i.id,
            quantity: i.quantity,
            unit: i.unit || "g",
          })),
        }),
      });
      Alert.alert("Recette créée", "Votre recette a été sauvegardée.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder la recette.");
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
            <Text style={s.title}>Nouvelle recette</Text>
          </View>

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
                  <Text style={s.ingCal}>{Math.round((ing.calories * ing.quantity) / 100)} kcal</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQuantity(ing.id, -10)}>
                    <Text style={s.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyValue}>{ing.quantity}g</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQuantity(ing.id, 10)}>
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
            <Text style={s.saveBtnText}>{saving ? "Sauvegarde..." : "Sauvegarder la recette"}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray[100], justifyContent: "center", alignItems: "center" },
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
