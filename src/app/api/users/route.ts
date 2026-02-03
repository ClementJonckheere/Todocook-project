import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedDatabase();
  const { rows } = await query("SELECT * FROM users WHERE id = 1");
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const {
    first_name, last_name, age, weight, height,
    gender, activity_level,
    daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal,
  } = body;

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
    WHERE id = 1`,
    [first_name, last_name, age, weight, height, gender, activity_level, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal]
  );

  const { rows } = await query("SELECT * FROM users WHERE id = 1");
  return NextResponse.json(rows[0]);
}
