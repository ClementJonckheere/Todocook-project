// Set this to your deployed Next.js API server URL
// For local dev, use your computer's LAN IP (not localhost, since the phone can't reach it)
// IMPORTANT: Change this IP to match your computer's local IP address
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.86.26:3000";

// Mobile dev user ID - used for development authentication bypass
const MOBILE_DEV_USER_ID = "1";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// Get headers with mobile dev authentication
export function getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Mobile-Dev-User": MOBILE_DEV_USER_ID,
    ...additionalHeaders,
  };
}

export async function apiFetch(path: string, options?: RequestInit) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: getHeaders(options?.headers as Record<string, string>),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
