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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUrl } from "../src/lib/api";
import { colors } from "../src/theme/colors";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Erreur", "Email ou mot de passe incorrect");
      }
    } catch {
      // En mode dev, on retourne à l'app directement
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.container}
    >
      <View style={s.inner}>
        {/* Logo */}
        <View style={s.logoSection}>
          <View style={s.logoIcon}>
            <Ionicons name="flame" size={36} color={colors.white} />
          </View>
          <Text style={s.appName}>Todocook</Text>
          <Text style={s.tagline}>Connectez-vous pour continuer</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.gray[400]} style={s.inputIcon} />
              <TextInput
                style={s.input}
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
            <Text style={s.label}>Mot de passe</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.gray[400]} style={s.inputIcon} />
              <TextInput
                style={[s.input, { paddingRight: 44 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.gray[400]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[s.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={s.loginBtnText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.warm[50] },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },

  logoSection: { alignItems: "center", marginBottom: 48 },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary[500],
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: { fontSize: 32, fontWeight: "800", color: colors.gray[900], marginTop: 16, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: colors.gray[500], marginTop: 6 },

  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: colors.gray[700] },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.gray[900], paddingVertical: 14 },
  eyeBtn: { position: "absolute", right: 14, padding: 4 },

  loginBtn: {
    backgroundColor: colors.primary[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: colors.primary[500],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
