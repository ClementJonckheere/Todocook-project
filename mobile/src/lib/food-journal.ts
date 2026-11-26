// Miroir mobile de src/lib/food-journal.ts (web) : mêmes repas et mêmes bornes que l'API.
export const MEAL_LABELS = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
} as const;

export type MealType = keyof typeof MEAL_LABELS;

export const MEAL_TYPES = Object.keys(MEAL_LABELS) as MealType[];

export const MAX_GRAMS = 10000;
export const MAX_PORTIONS = 100;

export function validFoodAmount(grams: number): boolean {
  return Number.isFinite(grams) && grams > 0 && grams <= MAX_GRAMS;
}

export function validPortions(portions: number): boolean {
  return Number.isFinite(portions) && portions > 0 && portions <= MAX_PORTIONS;
}

/** Lit un nombre saisi au clavier français ("1,5" comme "1.5"). */
export function parseDecimal(value: string): number {
  return Number(value.replace(",", ".").trim());
}

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

/** Valeur pour une quantité en grammes, à partir d'une valeur pour 100 g. */
export function per100g(value100g: number, grams: number): number {
  return (value100g * grams) / 100;
}

export function foodLabel(food: { name: string; brand: string | null }): string {
  return food.brand ? `${food.name} · ${food.brand}` : food.name;
}

/**
 * Calories, protéines, glucides et lipides connus ? Un produit scanné peut avoir des valeurs
 * inconnues (null) sur Open Food Facts : il ne doit pas compter pour 0 kcal dans le journal.
 */
export function hasNutrition(food: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null }): boolean {
  return [food.calories, food.protein, food.carbs, food.fat].every((value) => value !== null && value !== undefined);
}

/** Valeur affichable : "?" si inconnue. */
export function shownValue(value: number | null | undefined, unit = ""): string {
  return value === null || value === undefined ? "?" : `${Math.round(value)}${unit}`;
}
