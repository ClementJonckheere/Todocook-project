/**
 * Remplace `next/headers` pendant les tests : hors du serveur Next, cookies() et headers()
 * n'ont pas de requête courante. Le harnais (api-harness.ts) y place celle du test.
 */
type CookieValue = { name: string; value: string };

export const requestContext: {
  headers: Headers;
  cookies: Map<string, string>;
  setCookies: Map<string, string | null>;
} = { headers: new Headers(), cookies: new Map(), setCookies: new Map() };

export async function headers() {
  return requestContext.headers;
}

export async function cookies() {
  return {
    get: (name: string): CookieValue | undefined =>
      requestContext.cookies.has(name) ? { name, value: requestContext.cookies.get(name)! } : undefined,
    set: (name: string, value: string) => {
      requestContext.cookies.set(name, value);
      requestContext.setCookies.set(name, value);
    },
    delete: (name: string) => {
      requestContext.cookies.delete(name);
      requestContext.setCookies.set(name, null);
    },
  };
}
