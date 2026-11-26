// Miroir mobile de src/lib/recipe-portions.ts (web) : conversions d'unités vers les grammes.
export interface IngredientMeasure {
  name: string;
  unit: string;
  barcode?: string | null;
}

export function gramsPerUnit(ingredient: IngredientMeasure, unit: string): number | null {
  if (unit === "g") return 1;
  if (unit === "kg") return 1000;
  if (ingredient.barcode || ingredient.unit !== unit) return null;
  if (unit === "pièce" && ingredient.name === "Oeuf") return 50;
  if (unit === "ml" && ingredient.name === "Huile d'olive") return 0.91;
  if (unit === "ml" && ingredient.name === "Lait") return 1.03;
  return null;
}
