import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl } from "../../src/lib/api";
import { colors } from "../../src/theme/colors";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  activity_level: string;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  daily_carbs_goal: number;
  daily_fat_goal: number;
}

interface DailyLog {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [form, setForm] = useState({ age: "", weight: "", height: "", gender: "", activity_level: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, logsRes] = await Promise.all([
        fetch(apiUrl("/api/users")),
        fetch(apiUrl("/api/daily-logs?days=30")),
      ]);
      const userData = await userRes.json();
      const logsData = await logsRes.json();
      setUser(userData);
      setLogs(logsData);
      setForm({
        age: String(userData.age || ""),
        weight: String(userData.weight || ""),
        height: String(userData.height || ""),
        gender: userData.gender || "",
        activity_level: userData.activity_level || "",
      });
    } catch {
      // API not reachable
    }
  };

  const saveProfile = async () => {
    try {
      await fetch(apiUrl("/api/users"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: 1,
          age: parseInt(form.age) || null,
          weight: parseFloat(form.weight) || null,
          height: parseInt(form.height) || null,
          gender: form.gender || null,
          activity_level: form.activity_level || null,
        }),
      });
      setEditing(false);
      loadData();
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    }
  };

  // Nutrition averages
  const avgCalories = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.calories, 0) / logs.length) : 0;
  const avgProtein = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.protein, 0) / logs.length) : 0;
  const avgCarbs = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.carbs, 0) / logs.length) : 0;
  const avgFat = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.fat, 0) / logs.length) : 0;

  // Last 14 days for chart
  const chartDays = logs.slice(0, 14).reverse();
  const maxCal = Math.max(...chartDays.map((d) => d.calories), 1);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {user?.first_name?.[0] || "?"}{user?.last_name?.[0] || ""}
            </Text>
          </View>
          <Text style={s.name}>{user?.first_name} {user?.last_name}</Text>
          <Text style={s.email}>{user?.email}</Text>
        </View>

        {/* Personal info */}
        <TouchableOpacity style={s.section} onPress={() => setShowInfo(!showInfo)}>
          <View style={s.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={colors.primary[600]} />
            <Text style={s.sectionTitle}>Informations personnelles</Text>
            <Ionicons name={showInfo ? "chevron-up" : "chevron-down"} size={18} color={colors.gray[400]} />
          </View>
        </TouchableOpacity>

        {showInfo && (
          <View style={s.infoCard}>
            {editing ? (
              <>
                <View style={s.formRow}>
                  <Text style={s.formLabel}>Âge</Text>
                  <TextInput
                    style={s.formInput}
                    value={form.age}
                    onChangeText={(v) => setForm({ ...form, age: v })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={s.formRow}>
                  <Text style={s.formLabel}>Poids (kg)</Text>
                  <TextInput
                    style={s.formInput}
                    value={form.weight}
                    onChangeText={(v) => setForm({ ...form, weight: v })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={s.formRow}>
                  <Text style={s.formLabel}>Taille (cm)</Text>
                  <TextInput
                    style={s.formInput}
                    value={form.height}
                    onChangeText={(v) => setForm({ ...form, height: v })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={s.formRow}>
                  <Text style={s.formLabel}>Sexe</Text>
                  <View style={s.genderRow}>
                    {["homme", "femme"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[s.genderBtn, form.gender === g && s.genderBtnActive]}
                        onPress={() => setForm({ ...form, gender: g })}
                      >
                        <Text style={[s.genderText, form.gender === g && { color: colors.white }]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={s.editActions}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(false)}>
                    <Text style={s.cancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.saveBtn} onPress={saveProfile}>
                    <Text style={s.saveText}>Sauvegarder</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Âge</Text>
                  <Text style={s.infoValue}>{user?.age || "-"} ans</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Poids</Text>
                  <Text style={s.infoValue}>{user?.weight || "-"} kg</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Taille</Text>
                  <Text style={s.infoValue}>{user?.height || "-"} cm</Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Sexe</Text>
                  <Text style={s.infoValue}>{user?.gender || "-"}</Text>
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => setEditing(true)}>
                  <Ionicons name="create-outline" size={16} color={colors.primary[600]} />
                  <Text style={s.editText}>Modifier</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Nutrition stats */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="nutrition-outline" size={18} color={colors.accent[500]} />
            <Text style={s.sectionTitle}>Nutrition (30 jours)</Text>
          </View>
        </View>

        <View style={s.statsCard}>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{avgCalories}</Text>
              <Text style={s.statLabel}>kcal/jour</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{avgProtein}g</Text>
              <Text style={s.statLabel}>Protéines</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{avgCarbs}g</Text>
              <Text style={s.statLabel}>Glucides</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statValue}>{avgFat}g</Text>
              <Text style={s.statLabel}>Lipides</Text>
            </View>
          </View>

          {/* Mini bar chart */}
          <View style={s.chartRow}>
            {chartDays.map((day, i) => {
              const h = Math.max((day.calories / maxCal) * 60, 4);
              const pct = user ? day.calories / user.daily_calorie_goal : 0;
              const barColor = pct < 0.7 ? colors.primary[400] : pct < 0.9 ? colors.accent[400] : colors.red[400];
              return (
                <View key={i} style={s.chartBar}>
                  <View style={[s.bar, { height: h, backgroundColor: barColor }]} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Create recipe button */}
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => router.push("/creation-recette")}
        >
          <Ionicons name="add-circle" size={22} color={colors.white} />
          <Text style={s.createText}>Créer une recette</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary[500], justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 26, fontWeight: "bold", color: colors.white },
  name: { fontSize: 20, fontWeight: "bold", color: colors.gray[900], marginTop: 12 },
  email: { fontSize: 13, color: colors.gray[500], marginTop: 2 },
  section: { marginHorizontal: 20, marginTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, padding: 14, borderRadius: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.gray[900] },
  infoCard: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  infoLabel: { fontSize: 13, color: colors.gray[500] },
  infoValue: { fontSize: 13, fontWeight: "600", color: colors.gray[900] },
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, paddingVertical: 10 },
  editText: { color: colors.primary[600], fontWeight: "600", fontSize: 13 },
  formRow: { marginBottom: 12 },
  formLabel: { fontSize: 12, color: colors.gray[500], marginBottom: 4 },
  formInput: { backgroundColor: colors.gray[50], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: colors.gray[200] },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.gray[200], alignItems: "center" },
  genderBtnActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  genderText: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  editActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.gray[100], alignItems: "center" },
  cancelText: { fontWeight: "600", color: colors.gray[600] },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary[500], alignItems: "center" },
  saveText: { fontWeight: "600", color: colors.white },
  statsCard: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  statsGrid: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: colors.gray[900] },
  statLabel: { fontSize: 10, color: colors.gray[500], marginTop: 2 },
  chartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 70, marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.gray[100] },
  chartBar: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: 12, borderRadius: 4 },
  createBtn: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.primary[500], borderRadius: 14, paddingVertical: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, shadowColor: colors.primary[500], shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  createText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
