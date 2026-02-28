import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = await params;

    const { rows: logRows } = await query(
      `SELECT wl.*, ur.name as routine_name
       FROM workout_logs wl
       LEFT JOIN user_routines ur ON wl.routine_id = ur.id
       WHERE wl.id = $1 AND wl.user_id = $2`,
      [id, userId]
    );

    if (logRows.length === 0) {
      return NextResponse.json({ error: "Log non trouvé" }, { status: 404 });
    }

    // Get exercise logs
    const { rows: exerciseLogs } = await query(
      `SELECT wel.*, e.name as exercise_name, e.muscle_group
       FROM workout_exercise_logs wel
       JOIN exercises e ON wel.exercise_id = e.id
       WHERE wel.workout_log_id = $1
       ORDER BY wel.exercise_id, wel.set_number`,
      [id]
    );

    return NextResponse.json({ ...logRows[0], exercise_logs: exerciseLogs });
  } catch (error) {
    console.error("GET /api/workout-logs/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = await params;
    const body = await request.json();
    const { completed, duration_minutes, notes } = body;

    // Check ownership
    const { rows: existingRows } = await query(
      `SELECT id FROM workout_logs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Log non trouvé" }, { status: 404 });
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (completed !== undefined) {
      updateFields.push(`completed = $${paramIndex++}`);
      updateValues.push(completed);
    }

    if (duration_minutes !== undefined) {
      updateFields.push(`duration_minutes = $${paramIndex++}`);
      updateValues.push(duration_minutes);
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateValues.push(notes);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      const { rows } = await query(
        `UPDATE workout_logs SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );
      return NextResponse.json(rows[0]);
    }

    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/workout-logs/[id] error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = await params;

    const result = await query(
      `DELETE FROM workout_logs WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Log non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workout-logs/[id] error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
