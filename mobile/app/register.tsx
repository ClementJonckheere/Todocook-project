import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl } from "../src/lib/api";
import { colors } from "../src/theme/colors";

const ACTIVITY_LEVELS = [
  { value: "sedentaire", label: "Sédentaire" },
  { value: "leger", label: "Léger" },
  { value: "modere", label: "Modéré" },
  { value: "actif", label: "Actif" },
  { value: "tres_actif", label: "Très actif" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2 fields (optional)
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");

  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Erreur", "Prénom et nom sont requis");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Erreur", "Adresse email invalide");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return false;
    }
    if (password !== confirm) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const body: Record<string, string | number> = {
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };
      if (age) body.age = parseInt(age);
      if (weight) body.weight = parseFloat(weight);
      if (height) body.height = parseInt(height);
      if (gender) body.gender = gender;
      if (activityLevel) body.activity_level = activityLevel;

      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        router.replace("/(tabs)");
      } else if (data.errors) {
        const msg = data.errors.map((e: { message: string }) => e.message).join("\n");
        Alert.alert("Erreur", msg);
      } else {
        Alert.alert("Erreur", data.error || "Impossible de créer le compte");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={() => (step === 1 ? router.back() : setStep(1))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray[700]} />
          </TouchableOpacity>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: step === 1 ? "50%" : "100%" }]} />
          </View>
          <Text style={s.stepLabel}>{step}/2</Text>
        </View>

        {/* Title */}
        <View style={s.titleSection}>
          <Text style={s.title}>
            {step === 1 ? "Créer un compte" : "Mon profil"}
          </Text>
          <Text style={s.subtitle}>
            {step === 1
              ? "Étape 1 — Vos informations de connexion"
              : "Étape 2 — Optionnel, pour vos objectifs nutritionnels"}
          </Text>
        </View>

        {/* ─── Step 1 ─── */}
        {step === 1 && (
          <View style={s.form}>
            <View style={s.row}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Prénom *</Text>
                <TextInput
                  style={s.input}
                  placeholder="Jean"
                  placeholderTextColor={colors.gray[400]}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Nom *</Text>
                <TextInput
                  style={s.input}
                  placeholder="Dupont"
                  placeholderTextColor={colors.gray[400]}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Email *</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.gray[400]} style={s.inputIcon} />
                <TextInput
                  style={s.inputInner}
                  placeholder="exemple@email.com"
                  placeholderTextColor={colors.gray[400]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Mot de passe * (6 car. min.)</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.gray[400]} style={s.inputIcon} />
                <TextInput
                  style={[s.inputInner, { paddingRight: 40 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.gray[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={s.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.gray[400]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Confirmer le mot de passe *</Text>
              <View style={s.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.gray[400]} style={s.inputIcon} />
                <TextInput
                  style={[s.inputInner, { paddingRight: 40 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.gray[400]}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity
                  style={s.eyeBtn}
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={colors.gray[400]} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => { if (validateStep1()) setStep(2); }}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Step 2 ─── */}
        {step === 2 && (
          <View style={s.form}>
            <View style={s.optionalBanner}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary[600]} />
              <Text style={s.optionalText}>
                Ces informations permettent de calculer vos objectifs caloriques. Vous pouvez les renseigner plus tard dans votre profil.
              </Text>
            </View>

            <View style={s.row}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Âge</Text>
                <TextInput
                  style={s.input}
                  placeholder="25"
                  placeholderTextColor={colors.gray[400]}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Poids (kg)</Text>
                <TextInput
                  style={s.input}
                  placeholder="70"
                  placeholderTextColor={colors.gray[400]}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Taille (cm)</Text>
                <TextInput
                  style={s.input}
                  placeholder="175"
                  placeholderTextColor={colors.gray[400]}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Sexe</Text>
              <View style={s.chipRow}>
                {[{ value: "homme", label: "Homme" }, { value: "femme", label: "Femme" }].map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[s.chip, gender === g.value && s.chipActive]}
                    onPress={() => setGender(gender === g.value ? "" : g.value)}
                  >
                    <Text style={[s.chipText, gender === g.value && s.chipTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Niveau d'activité</Text>
              <View style={s.chipRow}>
                {ACTIVITY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[s.chip, activityLevel === level.value && s.chipActive]}
                    onPress={() => setActivityLevel(activityLevel === level.value ? "" : level.value)}
                  >
                    <Text style={[s.chipText, activityLevel === level.value && s.chipTextActive]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={s.primaryBtnText}>Créer mon compte</Text>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.skipBtn}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={s.skipText}>Passer cette étape</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Login link */}
        {step === 1 && (
          <TouchableOpacity style={s.loginLink} onPress={() => router.replace("/login")}>
            <Text style={s.loginLinkText}>
              Déjà un compte ?{" "}
              <Text style={s.loginLinkBold}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warm[50] },
  scroll: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

  // Header
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: colors.primary[500], borderRadius: 3 },
  stepLabel: { fontSize: 12, fontWeight: "700", color: colors.gray[400] },

  // Title
  titleSection: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: "800", color: colors.gray[900], letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.gray[500], marginTop: 6, lineHeight: 18 },

  // Form
  form: { gap: 16 },
  row: { flexDirection: "row", gap: 10 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: colors.gray[600] },

  // Simple input (standalone)
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray[900],
  },

  // Input with icon
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  inputInner: { flex: 1, fontSize: 15, color: colors.gray[900], paddingVertical: 12 },
  eyeBtn: { position: "absolute", right: 14, padding: 4 },

  // Optional banner
  optionalBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  optionalText: { flex: 1, fontSize: 12, color: colors.primary[700], lineHeight: 17 },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.gray[600] },
  chipTextActive: { color: colors.white },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary[500],
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: colors.primary[500],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { fontSize: 14, color: colors.gray[400], fontWeight: "500" },

  // Login link
  loginLink: { marginTop: 28, alignItems: "center" },
  loginLinkText: { fontSize: 14, color: colors.gray[500] },
  loginLinkBold: { color: colors.primary[600], fontWeight: "700" },
});
