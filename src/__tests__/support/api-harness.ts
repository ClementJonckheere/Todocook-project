/**
 * Harnais des tests de routes API : appelle directement les fonctions des fichiers route.ts
 * avec de vraies Request, contre la base Postgres de test (TEST_DATABASE_URL).
 * Seul `next/headers` est remplacé (voir next-headers.ts et moduleNameMapper dans jest.config.js).
 */
import { randomUUID } from "crypto";
import { requestContext } from "./next-headers";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getPool, query } from "@/lib/db";

export const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

// Toute fonction de route (avec ou sans paramètres dynamiques)
type Handler = (...args: never[]) => Promise<Response> | Response;

export interface CallOptions {
  method?: string;
  query?: Record<string, string | number>;
  body?: unknown;
  /** Token de session envoyé en Bearer (comme l'app mobile) */
  token?: string;
  /** Token envoyé en cookie (comme le web) */
  cookie?: string;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export interface CallResult<T = any> {
  status: number;
  body: T;
  setCookies: Map<string, string | null>;
}

/** Appelle un handler de route comme le ferait Next.js. */
export async function call<T = any>(handler: Handler, path: string, options: CallOptions = {}): Promise<CallResult<T>> {
  const url = new URL(`http://localhost${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, String(value));
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);

  requestContext.headers = headers;
  requestContext.cookies = new Map(options.cookie ? [[SESSION_COOKIE, options.cookie]] : []);
  requestContext.setCookies = new Map();

  const request = new Request(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : typeof options.body === "string" ? options.body : JSON.stringify(options.body),
  });
  const context = options.params
    ? { params: Promise.resolve(Object.fromEntries(Object.entries(options.params).map(([k, v]) => [k, String(v)]))) }
    : undefined;
  const response = await (handler as (r: Request, c?: unknown) => Promise<Response>)(request, context);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // corps non JSON
  }
  return { status: response.status, body: body as T, setCookies: requestContext.setCookies };
}

export interface TestUser {
  id: number;
  email: string;
  password: string;
  token: string;
}

/** Crée un utilisateur (email unique) avec une session active. */
export async function createUser(label: string, profile: Record<string, unknown> = {}): Promise<TestUser> {
  const email = `${label}.${randomUUID().slice(0, 8)}@test.local`;
  const password = "motdepasse-test";
  const { rows } = await query<{ id: number }>(
    `INSERT INTO users (email, password_hash, first_name, last_name, age, weight, height, gender, activity_level,
       daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal)
     VALUES ($1, $2, $3, 'Test', $4, $5, $6, $7, $8, $9, $10, 250, 70) RETURNING id`,
    [email, hashPassword(password), label, profile.age ?? 30, profile.weight ?? 70, profile.height ?? 175,
      profile.gender ?? "homme", profile.activity_level ?? "modere", profile.daily_calorie_goal ?? 2100,
      profile.daily_protein_goal ?? 60]
  );
  const token = await createSession(rows[0].id, "mobile");
  return { id: rows[0].id, email, password, token };
}

let counter = 0;
const unique = (label: string) => `${label} ${randomUUID().slice(0, 6)} ${++counter}`;

export async function createIngredient(fields: Partial<{ name: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; barcode: string | null; unit: string }> = {}) {
  const { rows } = await query(
    `INSERT INTO ingredients (name, calories, protein, carbs, fat, barcode, unit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [fields.name ?? unique("Ingrédient"), "calories" in fields ? fields.calories : 100, "protein" in fields ? fields.protein : 5,
      "carbs" in fields ? fields.carbs : 10, "fat" in fields ? fields.fat : 2, fields.barcode ?? null, fields.unit ?? "g"]
  );
  return rows[0];
}

/** Recette publique (owner null) ou privée d'un utilisateur, avec ses ingrédients. */
export async function createRecipe(owner: TestUser | null, options: { name?: string; isPublic?: boolean; servings?: number; ingredients?: { id: number; quantity?: number }[] } = {}) {
  const { rows } = await query<{ id: number; name: string }>(
    `INSERT INTO recipes (name, servings, calories, protein, carbs, fat, is_public, created_by, prep_time, cook_time)
     VALUES ($1, $2, 800, 40, 90, 20, $3, $4, 10, 10) RETURNING id, name`,
    [options.name ?? unique("Recette"), options.servings ?? 2, options.isPublic ?? owner === null, owner?.id ?? null]
  );
  for (const ingredient of options.ingredients ?? []) {
    await query("INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, 'g')",
      [rows[0].id, ingredient.id, ingredient.quantity ?? 100]);
  }
  return rows[0];
}

export { query, randomUUID };

/** À appeler dans afterAll : libère le pool pour que Jest se termine. */
export async function closeDb() {
  await (await getPool()).end();
}
