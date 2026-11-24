import { isMatch } from "date-fns";

export const MEAL_LABELS = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
} as const;

export type MealType = keyof typeof MEAL_LABELS;

export function journalDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && isMatch(value, "yyyy-MM-dd");
}

export function validFoodAmount(grams: unknown): grams is number {
  return typeof grams === "number" && Number.isFinite(grams) && grams > 0 && grams <= 10000;
}

export function validMeal(value: unknown): value is MealType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MEAL_LABELS, value);
}
