import { computeRecipeNutrition, roundHalfUp } from "@/lib/recipe-nutrition";

const riz = { name: "Riz blanc", unit: "g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 };
const oeuf = { name: "Oeuf", unit: "pièce", calories: 155, protein: 13, carbs: 1.1, fat: 11 };

describe("computeRecipeNutrition", () => {
  it("sums per-100 g values for the whole recipe, converting kitchen units", () => {
    expect(computeRecipeNutrition([
      { ingredient: riz, quantity: 200, unit: "g" },
      { ingredient: oeuf, quantity: 2, unit: "pièce" }, // 2 × 50 g
    ])).toEqual({ calories: 415, protein: 18.4, carbs: 57.1, fat: 11.6 });
  });

  it("returns null when a quantity cannot be converted to grams", () => {
    expect(computeRecipeNutrition([{ ingredient: riz, quantity: 1, unit: "pièce" }])).toBeNull();
  });

  it("gives zero for a recipe without ingredients", () => {
    expect(computeRecipeNutrition([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe("roundHalfUp", () => {
  it("rounds halves up like PostgreSQL, despite floating-point noise", () => {
    expect(roundHalfUp(12.149999999999999, 1)).toBe(12.2);
    expect(roundHalfUp(0.1 + 0.2 + 12.05 - 0.3, 1)).toBe(12.1);
    expect(roundHalfUp(2.5, 0)).toBe(3);
    expect(roundHalfUp(2.44, 1)).toBe(2.4);
  });
});
