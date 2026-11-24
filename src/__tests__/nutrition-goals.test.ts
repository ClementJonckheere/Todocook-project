import { calculateNutrition, goalIssue, isNutritionGoal, type NutritionInput } from "../lib/nutrition";
import { dinnerSuggestion } from "../lib/dinner-suggestion";

const profile: NutritionInput = { age: 30, weight: 75, height: 180, gender: "homme", activityLevel: "modere", sportType: "musculation" };

test("maintenance keeps existing estimates, and goals adjust the energy and macro targets", () => {
  const maintenance = calculateNutrition(profile);
  expect(calculateNutrition({ ...profile, goal: "maintien" })).toEqual(maintenance);
  const gain = calculateNutrition({ ...profile, goal: "prise_masse" });
  const loss = calculateNutrition({ ...profile, goal: "perte_poids" });
  expect(gain.dailyCalories).toBeGreaterThan(maintenance.dailyCalories);
  expect(loss.dailyCalories).toBeLessThan(maintenance.dailyCalories);
  expect(gain.dailyCarbs).toBeGreaterThan(loss.dailyCarbs);
});

test("automatic weight change requires an eligible adult profile", () => {
  expect(goalIssue("prise_masse", 17, 75, 180)).toBeTruthy();
  expect(goalIssue("perte_poids", 30, 50, 180)).toBeTruthy();
  expect(goalIssue("perte_poids", 30, 75, 180)).toBeNull();
  expect(isNutritionGoal("constructor")).toBe(false);
});

test("dinner targets change suggested portions and ranking", () => {
  expect(dinnerSuggestion(500, 25, 2250, 110).portions).toBe(1.5);
  expect(dinnerSuggestion(500, 25, 3000, 110).portions).toBe(2);
  expect(dinnerSuggestion(1000, 30, 1600, 100).portions).toBe(0.75);
  expect(dinnerSuggestion(500, 30, 1500, 90).distance).toBeLessThan(dinnerSuggestion(500, 5, 1500, 90).distance);
  expect(dinnerSuggestion(0, 0, 2000, 80).distance).toBe(Infinity);
});
