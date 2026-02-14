/**
 * Nutrition calculation utilities for mobile
 * Uses the Mifflin-St Jeor equation for BMR calculation
 */

export type Gender = "homme" | "femme";
export type ActivityLevel = "sedentaire" | "leger" | "modere" | "actif" | "tres_actif";
export type SportType = "aucun" | "musculation" | "course_a_pied" | "natation" | "cyclisme" | "football" | "basketball" | "tennis" | "boxe" | "crossfit" | "yoga" | "autre";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

const SPORT_ADJUSTMENTS: Record<SportType, number> = {
  aucun: 0,
  musculation: 50,
  course_a_pied: 100,
  natation: 80,
  cyclisme: 90,
  football: 70,
  basketball: 70,
  tennis: 60,
  boxe: 100,
  crossfit: 100,
  yoga: 20,
  autre: 50,
};

const SPORT_PROTEIN_MULTIPLIERS: Record<SportType, number> = {
  aucun: 0.8,
  musculation: 2.0,
  course_a_pied: 1.4,
  natation: 1.4,
  cyclisme: 1.4,
  football: 1.6,
  basketball: 1.5,
  tennis: 1.4,
  boxe: 1.8,
  crossfit: 1.8,
  yoga: 1.0,
  autre: 1.2,
};

export interface NutritionInput {
  age: number;
  weight: number;
  height: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  sportType?: SportType;
}

export interface NutritionResult {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

export function calculateNutrition(input: NutritionInput): NutritionResult {
  const { age, weight, height, gender, activityLevel, sportType = "aucun" } = input;

  // BMR using Mifflin-St Jeor
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  const bmr = gender === "homme" ? base + 5 : base - 161;

  // TDEE
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

  // Sport adjustment
  const sportAdjustment = SPORT_ADJUSTMENTS[sportType];
  const dailyCalories = Math.round(tdee + sportAdjustment);

  // Protein based on sport
  const proteinMultiplier = SPORT_PROTEIN_MULTIPLIERS[sportType];
  const dailyProtein = Math.round(weight * proteinMultiplier);

  // Fat (25-30% of calories)
  const fatPercentage = activityLevel === "sedentaire" ? 30 : 25;
  const dailyFat = Math.round((dailyCalories * (fatPercentage / 100)) / 9);

  // Carbs (remaining)
  const proteinCalories = dailyProtein * 4;
  const fatCalories = dailyFat * 9;
  const carbCalories = dailyCalories - proteinCalories - fatCalories;
  const dailyCarbs = Math.round(carbCalories / 4);

  return { dailyCalories, dailyProtein, dailyCarbs, dailyFat };
}
