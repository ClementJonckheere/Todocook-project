import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import { validateRequired, validateEmail, validatePassword } from "@/lib/validation";
import { calculateNutrition, type Gender, type ActivityLevel, type SportType } from "@/lib/nutrition";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      first_name,
      last_name,
      age,
      weight,
      height,
      gender,
      activity_level,
      sport_type,
    } = body;

    const errors = [
      ...validateRequired({ email, password, first_name, last_name }, ["email", "password", "first_name", "last_name"]),
      ...validatePassword(password),
    ];

    if (email && !validateEmail(email)) {
      errors.push({ field: "email", message: "Email invalide" });
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Check if email already exists
    const { rows: existing } = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      return NextResponse.json({ errors: [{ field: "email", message: "Cet email est déjà utilisé" }] }, { status: 409 });
    }

    // Calculate nutritional goals if personal info is provided
    let daily_calorie_goal = 2000;
    let daily_protein_goal = 50;
    let daily_carbs_goal = 250;
    let daily_fat_goal = 70;

    if (age && weight && height && gender && activity_level) {
      const nutrition = calculateNutrition({
        age: Number(age),
        weight: Number(weight),
        height: Number(height),
        gender: gender as Gender,
        activityLevel: activity_level as ActivityLevel,
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
        daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, email, first_name, last_name, age, weight, height, gender, activity_level, sport_type,
                 daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal`,
      [
        email, password_hash, first_name, last_name,
        age || null, weight || null, height || null, gender || null, activity_level || null, sport_type || "aucun",
        daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal,
      ]
    );

    const user = rows[0];
    const token = createSession(user.id);
    setSessionCookie(token);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
