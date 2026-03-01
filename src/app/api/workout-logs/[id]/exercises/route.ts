import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Log exercise sets
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id: workoutLogId } = await params;
    const body = await request.json();
    const { exercise_id, set_number, reps, weight, completed, rest_time_taken, notes } = body;

    // Check workout log ownership
    const { rows: logRows } = await query(
      `SELECT id FROM workout_logs WHERE id = $1 AND user_id = $2`,
      [workoutLogId, userId]
    );

    if (logRows.length === 0) {
      return NextResponse.json({ error: "Log non trouvé" }, { status: 404 });
    }

    const { rows } = await query(
      `INSERT INTO workout_exercise_logs
       (workout_log_id, exercise_id, set_number, reps, weight, completed, rest_time_taken, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (workout_log_id, exercise_id, set_number)
       DO UPDATE SET reps = $4, weight = $5, completed = $6, rest_time_taken = $7, notes = $8
       RETURNING *`,
      [
        workoutLogId,
        exercise_id,
        set_number,
        reps || null,
        weight || null,
        completed || false,
        rest_time_taken || null,
        notes || null
      ]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/workout-logs/[id]/exercises error:", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }
}

// Batch log multiple sets
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id: workoutLogId } = await params;
    const body = await request.json();
    const { sets } = body; // Array of { exercise_id, set_number, reps, weight, completed }

    // Check workout log ownership
    const { rows: logRows } = await query(
      `SELECT id FROM workout_logs WHERE id = $1 AND user_id = $2`,
      [workoutLogId, userId]
    );

    if (logRows.length === 0) {
      return NextResponse.json({ error: "Log non trouvé" }, { status: 404 });
    }

    const results = [];
    for (const set of sets) {
      const { rows } = await query(
        `INSERT INTO workout_exercise_logs
         (workout_log_id, exercise_id, set_number, reps, weight, completed, rest_time_taken, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [
          workoutLogId,
          set.exercise_id,
          set.set_number,
          set.reps || null,
          set.weight || null,
          set.completed || false,
          set.rest_time_taken || null,
          set.notes || null
        ]
      );
      if (rows[0]) results.push(rows[0]);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("PUT /api/workout-logs/[id]/exercises error:", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }
}
