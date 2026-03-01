import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { validateRequired, validateMaxLength } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

    const result = await query(`
      SELECT
        ur.*,
        COUNT(DISTINCT re.id) as exercise_count,
        COALESCE(SUM(re.sets), 0) as total_sets
      FROM user_routines ur
      LEFT JOIN routine_exercises re ON ur.id = re.routine_id
      WHERE ur.user_id = $1
      GROUP BY ur.id
      ORDER BY ur.is_active DESC, ur.name
    `, [userId]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/routines error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json();
    const { name, description, days_of_week, exercises } = body;

    // Validation
    const errors = [
      ...validateRequired({ name }, ["name"]),
      ...validateMaxLength(name, "name", 100),
      ...validateMaxLength(description, "description", 500),
    ];

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { rows: routineRows } = await query(
      `INSERT INTO user_routines (user_id, name, description, days_of_week, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [userId, name, description || null, days_of_week || []]
    );
    const routine = routineRows[0];

    // Add exercises if provided
    if (exercises && exercises.length > 0) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await query(
          `INSERT INTO routine_exercises (routine_id, exercise_id, position, sets, reps, weight, rest_time, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [routine.id, ex.exercise_id, i + 1, ex.sets || 3, ex.reps || 10, ex.weight || 0, ex.rest_time || 90, ex.notes || null]
        );
      }
    }

    return NextResponse.json(routine, { status: 201 });
  } catch (error) {
    console.error("POST /api/routines error:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la routine" }, { status: 500 });
  }
}
