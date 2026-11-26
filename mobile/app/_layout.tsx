import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { hasSession, loadSession, onUnauthorized } from "../src/lib/api";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSession()
      .catch(() => false)
      .finally(() => setReady(true));
    // Session expirée ou révoquée côté serveur : retour à l'écran de connexion
    return onUnauthorized(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === "login";
    if (!hasSession() && !onLogin) router.replace("/login");
    if (hasSession() && onLogin) router.replace("/(tabs)");
  }, [ready, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="creation-recette"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="journal-alimentaire" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="suggestions-recettes"
          options={{
            presentation: "modal",
            animation: "slide_from_right",
          }}
        />
      </Stack>
    </>
  );
}
