import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, apiUrl } from "../lib/api";
import { foodLabel } from "../lib/food-journal";
import { colors } from "../theme/colors";

interface Food {
  id: number;
  name: string;
  brand: string | null;
  excluded: boolean;
}

const MAX_RESULTS = 8;

/** Normalise pour une recherche sans accents ni majuscules ("oeuf" trouve "Œuf"). */
const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe");

/**
 * Ingrédients à éviter pour les dîners suggérés (équivalent mobile de DinnerExclusions côté web).
 * Les dîners qui contiennent un ingrédient exclu ne sont plus proposés.
 */
export function DinnerExclusions({ onChange }: { onChange: () => void }) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiRequest(apiUrl("/api/users/dinner-exclusions"));
        if (!res.ok) throw new Error();
        const data: Food[] = await res.json();
        if (!cancelled) {
          setFoods(data);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Impossible de charger vos préférences.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retry]);

  const update = async (id: number, excluded: boolean) => {
    setBusyId(id);
    setError("");
    try {
      const res = await apiRequest(apiUrl("/api/users/dinner-exclusions"), {
        method: "PUT",
        body: JSON.stringify({ id, excluded }),
      });
      if (!res.ok) throw new Error();
      setFoods((previous) => previous.map((food) => (food.id === id ? { ...food, excluded } : food)));
      if (excluded) setSearch("");
      onChange();
    } catch {
      setError("Impossible d'enregistrer cette préférence.");
    } finally {
      setBusyId(null);
    }
  };

  const excluded = foods.filter((food) => food.excluded);
  const term = normalize(search.trim());
  const matches = term.length >= 1
    ? foods.filter((food) => !food.excluded && normalize(foodLabel(food)).includes(term)).slice(0, MAX_RESULTS)
    : [];
  const busy = busyId !== null;

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.header} onPress={() => setOpen(!open)} accessibilityRole="button">
        <Ionicons name="ban-outline" size={16} color={colors.gray[600]} />
        <Text style={s.title}>
          Ingrédients à éviter{excluded.length > 0 ? ` (${excluded.length})` : ""}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.gray[500]} />
      </TouchableOpacity>

      {/* Les exclusions actives restent visibles même repliées */}
      {excluded.length > 0 && (
        <View style={s.chips}>
          {excluded.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={s.chip}
              disabled={busy}
              onPress={() => update(food.id, false)}
              accessibilityLabel={`Autoriser de nouveau ${foodLabel(food)}`}
            >
              <Text style={s.chipText}>{foodLabel(food)}</Text>
              {busyId === food.id
                ? <ActivityIndicator size="small" color={colors.gray[500]} />
                : <Ionicons name="close" size={14} color={colors.gray[500]} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {open && (
        <View style={s.body}>
          <Text style={s.hint}>Les dîners qui contiennent ces ingrédients ne sont plus proposés.</Text>
          <View style={s.searchRow}>
            <Ionicons name="search" size={16} color={colors.gray[400]} />
            <TextInput
              style={s.searchInput}
              placeholder={loading ? "Chargement…" : "Rechercher un ingrédient"}
              placeholderTextColor={colors.gray[400]}
              value={search}
              onChangeText={setSearch}
              editable={!loading}
              autoCorrect={false}
            />
          </View>
          {matches.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={s.match}
              disabled={busy}
              onPress={() => update(food.id, true)}
              accessibilityLabel={`Éviter ${foodLabel(food)}`}
            >
              <Text style={s.matchText}>{foodLabel(food)}</Text>
              {busyId === food.id
                ? <ActivityIndicator size="small" color={colors.primary[500]} />
                : <Ionicons name="remove-circle-outline" size={20} color={colors.red[400]} />}
            </TouchableOpacity>
          ))}
          {term.length >= 1 && !loading && matches.length === 0 && (
            <Text style={s.hint}>Aucun ingrédient de recette ne correspond.</Text>
          )}
        </View>
      )}

      {error ? (
        <View style={s.errorRow}>
          <Text style={s.error}>{error}</Text>
          <TouchableOpacity onPress={() => setRetry((r) => r + 1)}>
            <Text style={s.link}>Recharger</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 20, marginTop: 10, backgroundColor: colors.white, borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.gray[700] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.gray[100],
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.gray[700] },
  body: { marginTop: 10, gap: 6 },
  hint: { fontSize: 11, color: colors.gray[500] },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.gray[50],
    borderRadius: 10, paddingHorizontal: 10, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray[900] },
  match: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  matchText: { fontSize: 14, color: colors.gray[800] },
  errorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  error: { flex: 1, fontSize: 12, color: colors.red[600] },
  link: { fontSize: 12, fontWeight: "700", color: colors.primary[600] },
});
