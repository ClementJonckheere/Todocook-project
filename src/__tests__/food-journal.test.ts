import { journalDate, validFoodAmount, validMeal } from "../lib/food-journal";

test("journal keys use real, unambiguous calendar dates", () => {
  expect(journalDate("2024-02-29")).toBe(true);
  for (const invalid of ["2026-02-29", "2026-11-31", "23/11/2026", "2026-1-2", null]) {
    expect(journalDate(invalid)).toBe(false);
  }
});

test("food amounts allow fractional grams and reject missing or invalid quantities", () => {
  expect(validFoodAmount(12.5)).toBe(true);
  for (const invalid of [NaN, Infinity, -12, 0, null, "12", 10001]) expect(validFoodAmount(invalid)).toBe(false);
});

test("only supported meal categories are stored", () => {
  expect(validMeal("collation")).toBe(true);
  expect(validMeal("constructor")).toBe(false);
  expect(validMeal(null)).toBe(false);
});
