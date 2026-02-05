import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { getAuthUser } from "@/lib/auth";
import { validateMaxLength, validatePositiveNumber } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedDatabase();
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
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
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const body = await request.json();
    const {
      first_name, last_name, age, weight, height,
      gender, activity_level,
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

    await query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        age = COALESCE($3, age),
        weight = COALESCE($4, weight),
        height = COALESCE($5, height),
        gender = COALESCE($6, gender),
        activity_level = COALESCE($7, activity_level),
        daily_calorie_goal = COALESCE($8, daily_calorie_goal),
        daily_protein_goal = COALESCE($9, daily_protein_goal),
        daily_carbs_goal = COALESCE($10, daily_carbs_goal),
        daily_fat_goal = COALESCE($11, daily_fat_goal),
        updated_at = NOW()
      WHERE id = $12`,
      [first_name, last_name, age, weight, height, gender, activity_level, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, userId]
    );

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = rows[0];
    delete user.password_hash;
    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/users error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
