import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, apiUrl, clearSession } from "../lib/api";
import { colors } from "../theme/colors";

type Section = "email" | "password" | "delete" | null;
type Status = { kind: "ok" | "error"; text: string } | null;

async function send(path: string, method: string, body: unknown) {
  const res = await apiRequest(apiUrl(path), { method, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data: data as { error?: string; message?: string; email?: string } };
}

/** Confirmation native (Alert n'affiche rien sur la cible web d'Expo). */
function confirmDestructive(message: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(message) ?? false);
  return new Promise((resolve) =>
    Alert.alert("Supprimer le compte", message, [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: "Supprimer", style: "destructive", onPress: () => resolve(true) },
    ])
  );
}

/** Section « Compte » du profil : e-mail, mot de passe, suppression du compte. */
export function AccountSettings({ email, onEmailChanged, onDeleted }: {
  email: string;
  onEmailChanged: (email: string) => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState<Section>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [form, setForm] = useState({
    newEmail: "", emailPassword: "", current: "", next: "", confirm: "", deletePassword: "", confirmation: "",
  });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggle = (section: Section) => {
    setOpen(open === section ? null : section);
    setStatus(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = () => run(async () => {
    const { ok, data } = await send("/api/account/email", "PUT", { email: form.newEmail, password: form.emailPassword });
    if (!ok) return setStatus({ kind: "error", text: data.error || "Modification impossible." });
    onEmailChanged(data.email ?? form.newEmail);
    setForm((f) => ({ ...f, newEmail: "", emailPassword: "" }));
    setStatus({ kind: "ok", text: "Adresse modifiée : utilisez-la pour vous connecter." });
  });

  const changePassword = () => run(async () => {
    if (form.next !== form.confirm) return setStatus({ kind: "error", text: "Les deux mots de passe ne correspondent pas." });
    const { ok, data } = await send("/api/account/password", "PUT", { current_password: form.current, new_password: form.next });
    if (!ok) return setStatus({ kind: "error", text: data.error || "Modification impossible." });
    setForm((f) => ({ ...f, current: "", next: "", confirm: "" }));
    setStatus({ kind: "ok", text: data.message || "Mot de passe modifié." });
  });

  const deleteAccount = () => run(async () => {
    const confirmed = await confirmDestructive("Votre compte et toutes vos données seront définitivement supprimés. Continuer ?");
    if (!confirmed) return;
    const { ok, data } = await send("/api/account", "DELETE", { password: form.deletePassword, confirmation: form.confirmation });
    if (!ok) return setStatus({ kind: "error", text: data.error || "Suppression impossible." });
    await clearSession();
    onDeleted();
  });

  const input = (key: keyof typeof form, placeholder: string, secure = true, extra: object = {}) => (
    <TextInput
      style={s.input}
      placeholder={placeholder}
      placeholderTextColor={colors.gray[400]}
      value={form[key]}
      onChangeText={set(key)}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
      editable={!busy}
      {...extra}
    />
  );

  const statusLine = status ? (
    <Text style={[s.status, status.kind === "error" ? s.statusError : s.statusOk]}>{status.text}</Text>
  ) : null;

  const button = (label: string, onPress: () => void, disabled: boolean, danger = false) => (
    <TouchableOpacity style={[s.button, danger && s.buttonDanger, (busy || disabled) && s.disabled]} onPress={onPress} disabled={busy || disabled}>
      {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.buttonText}>{label}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={s.wrapper}>
      <Text style={s.heading}>Compte</Text>

      <View style={s.card}>
        <TouchableOpacity style={s.row} onPress={() => toggle("email")}>
          <Ionicons name="mail-outline" size={18} color={colors.gray[600]} />
          <Text style={s.rowLabel}>Adresse e-mail</Text>
          <Text style={s.rowValue} numberOfLines={1}>{email}</Text>
        </TouchableOpacity>
        {open === "email" && (
          <View style={s.body}>
            {input("newEmail", "Nouvelle adresse", false, { keyboardType: "email-address", autoComplete: "email" })}
            {input("emailPassword", "Mot de passe actuel")}
            {button("Modifier l'adresse", changeEmail, !form.newEmail || !form.emailPassword)}
            {statusLine}
          </View>
        )}
      </View>

      <View style={s.card}>
        <TouchableOpacity style={s.row} onPress={() => toggle("password")}>
          <Ionicons name="key-outline" size={18} color={colors.gray[600]} />
          <Text style={s.rowLabel}>Mot de passe</Text>
        </TouchableOpacity>
        {open === "password" && (
          <View style={s.body}>
            {input("current", "Mot de passe actuel")}
            {input("next", "Nouveau (8 caractères minimum)")}
            {input("confirm", "Confirmer le nouveau mot de passe")}
            <Text style={s.hint}>Vos autres appareils seront déconnectés.</Text>
            {button("Changer le mot de passe", changePassword, !form.current || form.next.length < 8)}
            {statusLine}
          </View>
        )}
      </View>

      <View style={[s.card, s.cardDanger]}>
        <TouchableOpacity style={s.row} onPress={() => toggle("delete")}>
          <Ionicons name="trash-outline" size={18} color={colors.red[600]} />
          <Text style={[s.rowLabel, { color: colors.red[600] }]}>Supprimer mon compte</Text>
        </TouchableOpacity>
        {open === "delete" && (
          <View style={s.body}>
            <Text style={s.hint}>
              Toutes vos données seront définitivement supprimées (profil, garde-manger, planning, journal, listes,
              recettes privées). Une recette publique utilisée par d'autres est conservée, sans lien avec vous.
            </Text>
            {input("deletePassword", "Mot de passe")}
            {input("confirmation", "Tapez SUPPRIMER pour confirmer", false, { autoCapitalize: "characters" })}
            {button("Supprimer définitivement", deleteAccount, form.confirmation !== "SUPPRIMER" || !form.deletePassword, true)}
            {statusLine}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginHorizontal: 20, marginTop: 20, gap: 8 },
  heading: { fontSize: 13, fontWeight: "700", color: colors.gray[500], marginBottom: 2 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  cardDanger: { borderWidth: 1, borderColor: colors.red[100] },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: colors.gray[800] },
  rowValue: { flex: 1, textAlign: "right", fontSize: 13, color: colors.gray[500] },
  body: { marginTop: 12, gap: 8 },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.gray[200], paddingHorizontal: 12, fontSize: 14, color: colors.gray[900] },
  hint: { fontSize: 12, lineHeight: 17, color: colors.gray[500] },
  button: { marginTop: 4, backgroundColor: colors.primary[600], borderRadius: 10, height: 42, alignItems: "center", justifyContent: "center" },
  buttonDanger: { backgroundColor: colors.red[600] },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.5 },
  status: { fontSize: 13 },
  statusOk: { color: colors.primary[700] },
  statusError: { color: colors.red[600] },
});
