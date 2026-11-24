import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { MAX_PORTIONS, parseDecimal } from "../lib/food-journal";

const STEP = 0.5;

/** Saisie d'un nombre de portions : boutons −/+ par demi-portion, ou saisie libre (ex. 1,25). */
export function PortionStepper({ value, onChange, min = STEP, disabled }: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  disabled?: boolean;
}) {
  const current = parseDecimal(value);
  const step = (delta: number) => {
    const base = Number.isFinite(current) ? current : 1;
    const next = Math.min(MAX_PORTIONS, Math.max(min, Math.round((base + delta) / STEP) * STEP));
    onChange(String(next).replace(".", ","));
  };
  return (
    <View style={s.row}>
      <TouchableOpacity
        style={s.btn}
        onPress={() => step(-STEP)}
        disabled={disabled || !(current > min)}
        accessibilityLabel="Une demi-portion de moins"
      >
        <Ionicons name="remove" size={18} color={colors.gray[700]} />
      </TouchableOpacity>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        editable={!disabled}
        accessibilityLabel="Nombre de portions"
        selectTextOnFocus
      />
      <TouchableOpacity
        style={s.btn}
        onPress={() => step(STEP)}
        disabled={disabled || current >= MAX_PORTIONS}
        accessibilityLabel="Une demi-portion de plus"
      >
        <Ionicons name="add" size={18} color={colors.gray[700]} />
      </TouchableOpacity>
      <Text style={s.unit}>portion{current > 1 ? "s" : ""}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  btn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.gray[100],
    alignItems: "center", justifyContent: "center",
  },
  input: {
    width: 56, height: 34, borderRadius: 10, borderWidth: 1, borderColor: colors.gray[200],
    textAlign: "center", fontSize: 15, fontWeight: "600", color: colors.gray[900], paddingHorizontal: 6,
  },
  unit: { fontSize: 13, color: colors.gray[500] },
});
