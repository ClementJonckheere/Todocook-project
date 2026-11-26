import type { NextResponse } from "next/server";
import { query } from "./db";
import { validationError } from "./api-validation";
import { computeRecipeNutrition, type RecipeNutrition } from "./recipe-nutrition";

export interface RecipeIngredientInput {
  ingredient_id: number;
  quantity: number;
  unit?: string;
}

/**
 * Valeurs nutritionnelles d'une recette saisie (création ou modification), calculées
 * à partir de ses ingrédients avec la règle commune (computeRecipeNutrition).
 */
export async function nutritionFromInput(
  ingredients: RecipeIngredientInput[]
): Promise<{ nutrition: RecipeNutrition; response?: undefined } | { nutrition?: undefined; response: NextResponse }> {
  const lines = [];
  for (const ing of ingredients) {
    const { rows } = await query("SELECT * FROM ingredients WHERE id = $1", [ing.ingredient_id]);
    if (!rows[0]) return { response: validationError([{ field: "ingredients", message: "Ingrédient introuvable." }], 404) };
    lines.push({ ingredient: rows[0], quantity: ing.quantity, unit: ing.unit || "g" });
  }
  const nutrition = computeRecipeNutrition(lines);
  if (!nutrition) {
    return {
      response: validationError([{
        field: "ingredients",
        message: "Ingrédient sans valeurs nutritionnelles connues, ou quantité non convertible : indique le poids en grammes.",
      }]),
    };
  }
  return { nutrition };
}
