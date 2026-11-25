import { NextResponse } from "next/server";
import { goalIssue, validActivityProfile, calculateNutrition, type Gender, type ActivityLevel, type NutritionGoal, type SportType } from "@/lib/nutrition";
import { parseJsonBody, validationError } from "@/lib/api-validation";
import { nutritionCalculateSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, nutritionCalculateSchema);
    if (parsed.response) return parsed.response;
    const { age, weight, height, gender, activity_level, sport_type } = parsed.data;
    const goal = parsed.data.nutrition_goal as NutritionGoal;

    const issue = goalIssue(goal, age, weight, height);
    if (issue) return validationError([{ field: "nutrition_goal", message: issue }]);
    if (!validActivityProfile(gender, activity_level, sport_type)) {
      return validationError([{ field: "activity_level", message: "Profil d’activité invalide." }]);
    }
    const result = calculateNutrition({
      age,
      weight,
      height,
      gender: gender as Gender,
      activityLevel: activity_level as ActivityLevel,
      goal,
      sportType: (sport_type as SportType) || "aucun",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Nutrition calculation error:", error);
    return NextResponse.json({ error: "Erreur lors du calcul" }, { status: 500 });
  }
}
