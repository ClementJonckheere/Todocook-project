import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, createSession, setSessionCookie, sessionClientFrom } from "@/lib/auth";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { parseJsonBody, validationError } from "@/lib/api-validation";
import { registerSchema } from "@/lib/schemas";
import { goalIssue, validActivityProfile, calculateNutrition, type Gender, type ActivityLevel, type NutritionGoal, type SportType } from "@/lib/nutrition";

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(`register:ip:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const parsed = await parseJsonBody(request, registerSchema);
    if (parsed.response) return parsed.response;
    const {
      email, password, first_name, last_name,
      age, weight, height, gender, activity_level, sport_type,
    } = parsed.data;
    const goal = (parsed.data.nutrition_goal ?? "maintien") as NutritionGoal;

    // Règles qui portent sur plusieurs champs à la fois
    const issue = goalIssue(goal, Number(age), Number(weight), Number(height));
    if (issue) return validationError([{ field: "nutrition_goal", message: issue }]);
    if ((goal !== "maintien" || activity_level) && !validActivityProfile(gender, activity_level, sport_type)) {
      return validationError([{ field: "gender", message: "Complétez le sexe et le niveau d’activité du profil." }]);
    }

    // Check if email already exists
    const { rows: existing } = await query("SELECT id FROM users WHERE lower(email) = $1", [email]);
    if (existing.length > 0) {
      return validationError([{ field: "email", message: "Cet email est déjà utilisé" }], 409);
    }

    // Calculate nutritional goals if personal info is provided
    let daily_calorie_goal = 2000;
    let daily_protein_goal = 50;
    let daily_carbs_goal = 250;
    let daily_fat_goal = 70;

    if (age && weight && height && gender && activity_level) {
      const nutrition = calculateNutrition({
        age,
        weight,
        height,
        gender: gender as Gender,
        activityLevel: activity_level as ActivityLevel,
        goal,
        sportType: (sport_type as SportType) || "aucun",
      });
      daily_calorie_goal = nutrition.dailyCalories;
      daily_protein_goal = nutrition.dailyProtein;
      daily_carbs_goal = nutrition.dailyCarbs;
      daily_fat_goal = nutrition.dailyFat;
    }

    const password_hash = hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name,
        age, weight, height, gender, activity_level, sport_type,
        daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, nutrition_goal
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, email, first_name, last_name, age, weight, height, gender, activity_level, sport_type,
                 nutrition_goal, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal`,
      [
        email, password_hash, first_name, last_name,
        age || null, weight || null, height || null, gender || null, activity_level || null, sport_type || "aucun",
        daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, goal,
      ]
    );

    const user = rows[0];
    const client = sessionClientFrom(request);
    const token = await createSession(user.id, client);
    if (client === "web") await setSessionCookie(token);

    return NextResponse.json(client === "mobile" ? { ...user, token } : user, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
