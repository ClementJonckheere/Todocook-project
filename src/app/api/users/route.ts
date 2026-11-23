import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { validateMaxLength, validatePositiveNumber } from "@/lib/validation";
import { goalIssue, isNutritionGoal, validActivityProfile, calculateNutrition } from "@/lib/nutrition";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { rows } = await query("SELECT * FROM users WHERE id = $1", [userId]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    const user = rows[0];
    delete user.password_hash;
    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json();
    let {
      first_name, last_name, age, weight, height,
      gender, activity_level, sport_type,
      daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal,
    } = body;

    // Validation
    const errors = [
      ...validateMaxLength(first_name, "first_name", 100),
      ...validateMaxLength(last_name, "last_name", 100),
      ...validatePositiveNumber(age, "age"),
      ...validatePositiveNumber(weight, "weight"),
      ...validatePositiveNumber(height, "height"),
      ...validatePositiveNumber(daily_calorie_goal, "daily_calorie_goal"),
    ];

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Auto-calculate nutrition goals if personal info is complete
    // Always recalculate when personal info is provided (unless explicit goals are passed)
    const current = (await query("SELECT *, xmin::text AS revision FROM users WHERE id = $1", [userId])).rows[0];
    const goal = body.nutrition_goal === undefined ? current.nutrition_goal : body.nutrition_goal;
    const profile = {
      age: Number(age ?? current.age), weight: Number(weight ?? current.weight),
      height: Number(height ?? current.height), gender: gender ?? current.gender,
      activityLevel: activity_level ?? current.activity_level,
      sportType: sport_type ?? current.sport_type ?? "aucun",
    };
    const issue = isNutritionGoal(goal) ? goalIssue(goal, profile.age, profile.weight, profile.height) : "Objectif invalide.";
    if (issue) return NextResponse.json({ error: issue }, { status: 400 });
    const goalChanged = goal !== current.nutrition_goal;
    const profileChanged = ["age", "weight", "height", "gender", "activity_level", "sport_type"].some(
      key => body[key] != null && String(body[key]) !== String(current[key])
    );
    const hasCompletePersonalInfo = (goalChanged || profileChanged || (age && weight && height && gender && activity_level)) &&
      profile.age && profile.weight && profile.height && profile.gender && profile.activityLevel;

    if ((goal !== "maintien" || hasCompletePersonalInfo) &&
        !validActivityProfile(profile.gender, profile.activityLevel, profile.sportType)) {
      return NextResponse.json({ error: "Complétez le sexe et le niveau d’activité du profil." }, { status: 400 });
    }
    if (hasCompletePersonalInfo) {
      const nutrition = calculateNutrition({ ...profile, goal });
      // Use calculated values if not explicitly provided
      if (!daily_calorie_goal || ((goalChanged || profileChanged) && daily_calorie_goal === current.daily_calorie_goal)) daily_calorie_goal = nutrition.dailyCalories;
      if (!daily_protein_goal || ((goalChanged || profileChanged) && daily_protein_goal === current.daily_protein_goal)) daily_protein_goal = nutrition.dailyProtein;
      if (!daily_carbs_goal || ((goalChanged || profileChanged) && daily_carbs_goal === current.daily_carbs_goal)) daily_carbs_goal = nutrition.dailyCarbs;
      if (!daily_fat_goal || ((goalChanged || profileChanged) && daily_fat_goal === current.daily_fat_goal)) daily_fat_goal = nutrition.dailyFat;
    }

    const updated = await query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        age = COALESCE($3, age),
        weight = COALESCE($4, weight),
        height = COALESCE($5, height),
        gender = COALESCE($6, gender),
        activity_level = COALESCE($7, activity_level),
        sport_type = COALESCE($8, sport_type),
        daily_calorie_goal = COALESCE($9, daily_calorie_goal),
        daily_protein_goal = COALESCE($10, daily_protein_goal),
        daily_carbs_goal = COALESCE($11, daily_carbs_goal),
        daily_fat_goal = COALESCE($12, daily_fat_goal),
        nutrition_goal = COALESCE($14, nutrition_goal),
        updated_at = NOW()
      WHERE id = $13 AND xmin::text = $15 RETURNING *`,
      [first_name, last_name, age, weight, height, gender, activity_level, sport_type, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, userId, body.nutrition_goal, current.revision]
    );

    if (!updated.rowCount) return NextResponse.json({ error: "Le profil a changé. Rechargez-le avant de réessayer." }, { status: 409 });
    const user = updated.rows[0];
    delete user.password_hash;
    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/users error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
