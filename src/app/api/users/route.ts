import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export async function GET() {
  const db = getDb();
  seedDatabase();
  const user = db.prepare("SELECT * FROM users WHERE id = 1").get();
  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const db = getDb();
  const body = await request.json();
  const {
    first_name, last_name, age, weight, height,
    gender, activity_level,
    daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal,
  } = body;

  db.prepare(`
    UPDATE users SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      age = COALESCE(?, age),
      weight = COALESCE(?, weight),
      height = COALESCE(?, height),
      gender = COALESCE(?, gender),
      activity_level = COALESCE(?, activity_level),
      daily_calorie_goal = COALESCE(?, daily_calorie_goal),
      daily_protein_goal = COALESCE(?, daily_protein_goal),
      daily_carbs_goal = COALESCE(?, daily_carbs_goal),
      daily_fat_goal = COALESCE(?, daily_fat_goal),
      updated_at = datetime('now')
    WHERE id = 1
  `).run(
    first_name, last_name, age, weight, height,
    gender, activity_level,
    daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal
  );

  const user = db.prepare("SELECT * FROM users WHERE id = 1").get();
  return NextResponse.json(user);
}
