import { gramsPerUnit, type IngredientMeasure } from "./recipe-portions";

export interface NutritionPer100g extends IngredientMeasure {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeLine {
  ingredient: NutritionPer100g;
  quantity: number;
  unit: string;
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Valeurs nutritionnelles de la RECETTE ENTIÈRE, calculées à partir des ingrédients
 * (valeurs pour 100 g × quantité convertie en grammes). Arrondis : kcal à l'unité,
 * macros au dixième. Seul calcul utilisé pour les recettes créées et pour le catalogue.
 * Renvoie null si une quantité ne peut pas être convertie en grammes.
 */
export function computeRecipeNutrition(lines: RecipeLine[]): RecipeNutrition | null {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const line of lines) {
    const grams = gramsPerUnit(line.ingredient, line.unit || "g");
    if (!grams) return null;
    const factor = (line.quantity * grams) / 100;
    totals.calories += line.ingredient.calories * factor;
    totals.protein += line.ingredient.protein * factor;
    totals.carbs += line.ingredient.carbs * factor;
    totals.fat += line.ingredient.fat * factor;
  }
  return {
    calories: roundHalfUp(totals.calories, 0),
    protein: roundHalfUp(totals.protein, 1),
    carbs: roundHalfUp(totals.carbs, 1),
    fat: roundHalfUp(totals.fat, 1),
  };
}

/**
 * Arrondi « au plus proche, 0,5 vers le haut », identique au round(numeric) de PostgreSQL
 * utilisé par la migration 006. La précision est d'abord ramenée à 12 chiffres significatifs
 * pour gommer le bruit des flottants (12,15 calculé 12,149999… doit donner 12,2).
 */
export function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(Number((value * factor).toPrecision(12))) / factor;
}
