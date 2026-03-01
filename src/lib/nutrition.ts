/**
 * Nutrition calculation utilities
 * Uses the Mifflin-St Jeor equation for BMR calculation
 */

export type Gender = "homme" | "femme";

export type ActivityLevel =
  | "sedentaire"      // Little to no exercise
  | "leger"           // Light exercise 1-3 days/week
  | "modere"          // Moderate exercise 3-5 days/week
  | "actif"           // Hard exercise 6-7 days/week
  | "tres_actif";     // Very hard exercise, physical job

export type SportType =
  | "aucun"
  | "musculation"
  | "course_a_pied"
  | "athletisme"
  | "natation"
  | "cyclisme"
  | "football"
  | "basketball"
  | "tennis"
  | "rugby"
  | "boxe"
  | "arts_martiaux"
  | "yoga"
  | "crossfit"
  | "handball"
  | "volleyball"
  | "escalade"
  | "danse"
  | "ski"
  | "autre";

// Activity multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,      // Desk job, minimal movement
  leger: 1.375,         // Light activity 1-3 days/week
  modere: 1.55,         // Moderate activity 3-5 days/week
  actif: 1.725,         // Active lifestyle 6-7 days/week
  tres_actif: 1.9,      // Very active, physical labor
};

// Sport-specific adjustments (additional calories burned per session estimated)
const SPORT_ADJUSTMENTS: Record<SportType, number> = {
  aucun: 0,
  musculation: 50,      // Higher protein needs
  course_a_pied: 100,   // High endurance demand
  athletisme: 100,
  natation: 80,
  cyclisme: 90,
  football: 70,
  basketball: 70,
  tennis: 60,
  rugby: 80,
  boxe: 100,
  arts_martiaux: 80,
  yoga: 20,
  crossfit: 100,
  handball: 70,
  volleyball: 50,
  escalade: 60,
  danse: 50,
  ski: 70,
  autre: 50,
};

// Protein multipliers based on sport type (g per kg body weight)
const SPORT_PROTEIN_MULTIPLIERS: Record<SportType, number> = {
  aucun: 0.8,
  musculation: 2.0,     // High protein for muscle building
  course_a_pied: 1.4,
  athletisme: 1.6,
  natation: 1.4,
  cyclisme: 1.4,
  football: 1.6,
  basketball: 1.5,
  tennis: 1.4,
  rugby: 1.8,
  boxe: 1.8,
  arts_martiaux: 1.6,
  yoga: 1.0,
  crossfit: 1.8,
  handball: 1.5,
  volleyball: 1.4,
  escalade: 1.5,
  danse: 1.2,
  ski: 1.4,
  autre: 1.2,
};

export interface NutritionInput {
  age: number;          // years
  weight: number;       // kg
  height: number;       // cm
  gender: Gender;
  activityLevel: ActivityLevel;
  sportType?: SportType;
}

export interface NutritionResult {
  bmr: number;                    // Basal Metabolic Rate (calories at rest)
  tdee: number;                   // Total Daily Energy Expenditure
  dailyCalories: number;          // Recommended daily calories
  dailyProtein: number;           // g
  dailyCarbs: number;             // g
  dailyFat: number;               // g
  proteinPercentage: number;      // % of calories
  carbsPercentage: number;        // % of calories
  fatPercentage: number;          // % of calories
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * This is the most accurate formula for BMR calculation
 *
 * Men:   BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age in years) + 5
 * Women: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age in years) − 161
 */
export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === "homme" ? base + 5 : base - 161;
}

/**
 * Calculate Total Daily Energy Expenditure
 * TDEE = BMR × Activity Multiplier
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Calculate complete nutritional needs based on user profile
 */
export function calculateNutrition(input: NutritionInput): NutritionResult {
  const { age, weight, height, gender, activityLevel, sportType = "aucun" } = input;

  // Calculate BMR
  const bmr = calculateBMR(weight, height, age, gender);

  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel);

  // Add sport-specific calorie adjustment
  const sportAdjustment = SPORT_ADJUSTMENTS[sportType];
  const dailyCalories = Math.round(tdee + sportAdjustment);

  // Calculate protein needs based on sport
  const proteinMultiplier = SPORT_PROTEIN_MULTIPLIERS[sportType];
  const dailyProtein = Math.round(weight * proteinMultiplier);

  // Calculate fat (25-30% of calories, 9 cal/g)
  // Athletes generally need 25% fat, sedentary 30%
  const fatPercentage = activityLevel === "sedentaire" ? 30 : 25;
  const dailyFat = Math.round((dailyCalories * (fatPercentage / 100)) / 9);

  // Calculate carbs (remaining calories, 4 cal/g)
  const proteinCalories = dailyProtein * 4;
  const fatCalories = dailyFat * 9;
  const carbCalories = dailyCalories - proteinCalories - fatCalories;
  const dailyCarbs = Math.round(carbCalories / 4);

  // Calculate percentages
  const actualProteinPercentage = Math.round((proteinCalories / dailyCalories) * 100);
  const actualFatPercentage = Math.round((fatCalories / dailyCalories) * 100);
  const actualCarbsPercentage = 100 - actualProteinPercentage - actualFatPercentage;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFat,
    proteinPercentage: actualProteinPercentage,
    carbsPercentage: actualCarbsPercentage,
    fatPercentage: actualFatPercentage,
  };
}

/**
 * Get human-readable activity level labels
 */
export function getActivityLevelLabel(level: ActivityLevel): string {
  const labels: Record<ActivityLevel, string> = {
    sedentaire: "Sédentaire (peu ou pas d'exercice)",
    leger: "Légèrement actif (exercice léger 1-3j/sem)",
    modere: "Modérément actif (exercice modéré 3-5j/sem)",
    actif: "Actif (exercice intense 6-7j/sem)",
    tres_actif: "Très actif (exercice très intense, travail physique)",
  };
  return labels[level];
}

/**
 * Get human-readable sport type labels
 */
export function getSportTypeLabel(sport: SportType): string {
  const labels: Record<SportType, string> = {
    aucun: "Aucun sport régulier",
    musculation: "Musculation",
    course_a_pied: "Course à pied",
    athletisme: "Athlétisme",
    natation: "Natation",
    cyclisme: "Cyclisme",
    football: "Football",
    basketball: "Basketball",
    tennis: "Tennis",
    rugby: "Rugby",
    boxe: "Boxe",
    arts_martiaux: "Arts martiaux",
    yoga: "Yoga / Pilates",
    crossfit: "CrossFit",
    handball: "Handball",
    volleyball: "Volleyball",
    escalade: "Escalade",
    danse: "Danse",
    ski: "Ski / Sports d'hiver",
    autre: "Autre sport",
  };
  return labels[sport];
}

/**
 * All available activity levels for UI dropdowns
 */
export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentaire", label: getActivityLevelLabel("sedentaire") },
  { value: "leger", label: getActivityLevelLabel("leger") },
  { value: "modere", label: getActivityLevelLabel("modere") },
  { value: "actif", label: getActivityLevelLabel("actif") },
  { value: "tres_actif", label: getActivityLevelLabel("tres_actif") },
];

/**
 * All available sport types for UI dropdowns
 */
export const SPORT_TYPES: { value: SportType; label: string }[] = [
  { value: "aucun", label: getSportTypeLabel("aucun") },
  { value: "musculation", label: getSportTypeLabel("musculation") },
  { value: "course_a_pied", label: getSportTypeLabel("course_a_pied") },
  { value: "athletisme", label: getSportTypeLabel("athletisme") },
  { value: "natation", label: getSportTypeLabel("natation") },
  { value: "cyclisme", label: getSportTypeLabel("cyclisme") },
  { value: "football", label: getSportTypeLabel("football") },
  { value: "basketball", label: getSportTypeLabel("basketball") },
  { value: "tennis", label: getSportTypeLabel("tennis") },
  { value: "rugby", label: getSportTypeLabel("rugby") },
  { value: "boxe", label: getSportTypeLabel("boxe") },
  { value: "arts_martiaux", label: getSportTypeLabel("arts_martiaux") },
  { value: "yoga", label: getSportTypeLabel("yoga") },
  { value: "crossfit", label: getSportTypeLabel("crossfit") },
  { value: "handball", label: getSportTypeLabel("handball") },
  { value: "volleyball", label: getSportTypeLabel("volleyball") },
  { value: "escalade", label: getSportTypeLabel("escalade") },
  { value: "danse", label: getSportTypeLabel("danse") },
  { value: "ski", label: getSportTypeLabel("ski") },
  { value: "autre", label: getSportTypeLabel("autre") },
];
