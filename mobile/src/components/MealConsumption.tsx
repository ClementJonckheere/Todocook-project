import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, apiUrl } from "../lib/api";
import { formatNumber, parseDecimal, validPortions } from "../lib/food-journal";
import { colors } from "../theme/colors";
import { PortionStepper } from "./PortionStepper";

/**
 * Indique combien de portions d'un repas planifié ont réellement été mangées.
 * Les valeurs nutritionnelles sont figées côté serveur au moment de la consommation.
 */
export function MealConsumption({ id, planned, consumed, onChange }: {
  id: number;
  planned: number;
  consumed: number;
  onChange: () => void | Promise<void>;
}) {
  const [amount, setAmount] = useState(String(consumed || planned).replace(".", ","));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const value = parseDecimal(amount);

  const save = async (portions: number) => {
    setBusy(true);
    setError("");
    try {
      const res = await apiRequest(apiUrl("/api/meal-plans"), {
        method: "PATCH",
        body: JSON.stringify({ id, portions }),
      });
      if (!res.ok) throw new Error();
      await onChange();
    } catch {
      setError("Le journal n'a pas pu être mis à jour. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.box}>
      <View style={s.statusRow}>
        <Ionicons
          name={consumed > 0 ? "checkmark-circle" : "time-outline"}
          size={14}
          color={consumed > 0 ? colors.primary[600] : colors.gray[400]}
        />
        <Text style={[s.status, consumed > 0 && { color: colors.primary[700] }]}>
          {consumed > 0 ? `Consommé · ${formatNumber(consumed, 2)} portion(s)` : "Prévu, pas encore mangé"}
        </Text>
      </View>
      <View style={s.actions}>
        <PortionStepper value={amount} onChange={setAmount} disabled={busy} />
        <TouchableOpacity
          style={[s.primary, (busy || !validPortions(value)) && s.disabled]}
          disabled={busy || !validPortions(value)}
          onPress={() => save(value)}
        >
          {busy ? <ActivityIndicator size="small" color={colors.white} /> : (
            <Text style={s.primaryText}>{consumed > 0 ? "Ajuster" : "J'ai mangé"}</Text>
          )}
        </TouchableOpacity>
      </View>
      {consumed > 0 && (
        <TouchableOpacity disabled={busy} onPress={() => save(0)} hitSlop={8}>
          <Text style={s.link}>Annuler la consommation</Text>
        </TouchableOpacity>
      )}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginTop: 10, gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  status: { fontSize: 12, color: colors.gray[500], fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  primary: {
    backgroundColor: colors.primary[600], borderRadius: 10, paddingHorizontal: 14, height: 34,
    alignItems: "center", justifyContent: "center", minWidth: 96,
  },
  primaryText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  disabled: { opacity: 0.5 },
  link: { fontSize: 12, color: colors.gray[500], textDecorationLine: "underline" },
  error: { fontSize: 12, color: colors.red[600] },
});
