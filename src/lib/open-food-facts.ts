/**
 * Lecture d'un produit Open Food Facts (https://world.openfoodfacts.org).
 * Une valeur nutritionnelle absente reste INCONNUE (null) : la remplacer par 0 ferait compter
 * le produit pour 0 kcal dans le journal sans que personne ne s'en aperçoive.
 */

export const OFF_TIMEOUT_MS = 8000;
const KJ_PER_KCAL = 4.184;
// Open Food Facts demande un User-Agent identifiant l'application (sans donnée personnelle)
const USER_AGENT = "TodoCook/1.0 (application de suivi nutritionnel)";

export interface OffNutrition {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
}

export interface OffProduct extends OffNutrition {
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
}

export type OffLookup =
  | { status: "found"; product: OffProduct }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string };

/** Nombre plausible pour 100 g (Open Food Facts renvoie parfois du texte ou des valeurs aberrantes). */
function per100g(value: unknown, max = 1000): number | null {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

/** kcal pour 100 g : valeur en kcal si présente, sinon conversion depuis les kJ. */
export function caloriesPer100g(nutriments: Record<string, unknown>): number | null {
  const kcal = per100g(nutriments["energy-kcal_100g"]);
  if (kcal !== null) return kcal;
  // energy-kj_100g, ou energy_100g qui est exprimé en kJ par Open Food Facts
  const kj = per100g(nutriments["energy-kj_100g"], 4000) ?? per100g(nutriments["energy_100g"], 4000);
  return kj === null ? null : Math.round((kj / KJ_PER_KCAL) * 10) / 10;
}

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export function parseOffProduct(product: Record<string, any>): OffProduct {
  const nutriments: Record<string, unknown> = product.nutriments ?? {};
  const image = text(product.image_url, 2000);
  return {
    name: text(product.product_name_fr, 200) ?? text(product.product_name, 200) ?? "Produit inconnu",
    brand: text(product.brands, 200),
    category: text(product.categories_tags?.[0]?.replace(/^\w\w:/, ""), 100),
    image_url: image && /^https:\/\//i.test(image) ? image : null,
    calories: caloriesPer100g(nutriments),
    protein: per100g(nutriments.proteins_100g, 100),
    carbs: per100g(nutriments.carbohydrates_100g, 100),
    fat: per100g(nutriments.fat_100g, 100),
    fiber: per100g(nutriments.fiber_100g, 100),
  };
}

/** Les quatre valeurs nécessaires au journal et aux recettes sont-elles connues ? */
export function hasNutrition(food: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null }): boolean {
  return [food.calories, food.protein, food.carbs, food.fat].every((value) => value !== null && value !== undefined);
}

export async function lookupOffProduct(
  barcode: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = OFF_TIMEOUT_MS
): Promise<OffLookup> {
  let response: Response;
  try {
    response = await fetchImpl(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // AbortSignal.timeout lève une DOMException « TimeoutError », qui n'est pas forcément
    // une instance d'Error selon l'environnement : on se fie au nom.
    const name = (error as { name?: unknown } | null)?.name;
    const timedOut = name === "TimeoutError" || name === "AbortError";
    return { status: "unavailable", reason: timedOut ? "délai dépassé" : "service injoignable" };
  }
  if (response.status === 404) return { status: "not_found" };
  if (!response.ok) return { status: "unavailable", reason: `réponse ${response.status}` };
  let data: { status?: number; product?: Record<string, any> };
  try {
    data = await response.json();
  } catch {
    return { status: "unavailable", reason: "réponse illisible" };
  }
  if (data.status !== 1 || !data.product) return { status: "not_found" };
  return { status: "found", product: parseOffProduct(data.product) };
}
