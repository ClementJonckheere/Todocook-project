// Set this to your deployed Next.js API server URL
// For local dev, use your computer's LAN IP (not localhost, since the phone can't reach it)
// IMPORTANT: Change this IP to match your computer's local IP address
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.86.35:3000";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
