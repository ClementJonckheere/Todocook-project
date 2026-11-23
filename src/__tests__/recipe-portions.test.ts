import { gramsPerUnit } from "../lib/recipe-portions";

test("three generic eggs use their estimated edible weight", () => {
  expect(3 * gramsPerUnit({ name: "Oeuf", unit: "pièce" }, "pièce")!).toBe(150);
});

test("a scanned product with unknown piece weight can be weighed in grams", () => {
  const product = { name: "Oeuf", unit: "pièce", barcode: "12345678" };
  expect(gramsPerUnit(product, "pièce")).toBeNull();
  expect(gramsPerUnit(product, "g")).toBe(1);
});

test("millilitres of oil use the ingredient-specific conversion", () => {
  expect(gramsPerUnit({ name: "Huile d'olive", unit: "ml" }, "ml")).toBe(0.91);
});
