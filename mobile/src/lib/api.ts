import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "todocook-session-token";
const API_PORT = 3000;

/**
 * URL de l'API Next.js :
 * 1. EXPO_PUBLIC_API_URL si défini (voir mobile/.env.example) ;
 * 2. sinon, en développement, l'IP de la machine qui sert le bundle Expo (même réseau que le téléphone).
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (__DEV__ && host) return `http://${host}:${API_PORT}`;
  throw new Error("EXPO_PUBLIC_API_URL n'est pas défini : impossible de joindre l'API.");
}

export const API_BASE_URL = resolveApiBaseUrl();

let sessionToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Charge le token enregistré sur l'appareil. À appeler au démarrage de l'application. */
export async function loadSession(): Promise<boolean> {
  sessionToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return sessionToken !== null;
}

export async function saveSession(token: string): Promise<void> {
  sessionToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearSession(): Promise<void> {
  sessionToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function hasSession(): boolean {
  return sessionToken !== null;
}

/** Notifié quand l'API répond 401 (session expirée ou révoquée). */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Client": "mobile",
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    ...additionalHeaders,
  };
}

/** fetch authentifié : ajoute le token de session et gère l'expiration. */
export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers as Record<string, string> | undefined),
  });
  if (res.status === 401 && sessionToken) {
    await clearSession();
    unauthorizedListeners.forEach((listener) => listener());
  }
  return res;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await apiRequest(apiUrl(path), options);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Connexion : le serveur renvoie un token opaque, stocké dans le trousseau sécurisé de l'appareil. */
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client": "mobile" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.error || "Connexion impossible");
  }
  await saveSession(data.token);
}

export async function logout(): Promise<void> {
  try {
    await apiRequest(apiUrl("/api/auth/logout"), { method: "POST" });
  } finally {
    await clearSession();
  }
}
