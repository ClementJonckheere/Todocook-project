import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Update a specific exercise in a routine
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id: routineId, exerciseId } = await params;
    const body = await request.json();
    const { sets, reps, weight, rest_time, notes } = body;

    // Check routine ownership
    const { rows: routineRows } = await query(
      `SELECT id FROM user_routines WHERE id = $1 AND user_id = $2`,
      [routineId, userId]
    );

    if (routineRows.length === 0) {
      return NextResponse.json({ error: "Routine non trouvée" }, { status: 404 });
    }

    // Update exercise
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (sets !== undefined) {
      updateFields.push(`sets = $${paramIndex++}`);
      updateValues.push(sets);
    }

    if (reps !== undefined) {
      updateFields.push(`reps = $${paramIndex++}`);
      updateValues.push(reps);
    }

    if (weight !== undefined) {
      updateFields.push(`weight = $${paramIndex++}`);
      updateValues.push(weight);
    }

    if (rest_time !== undefined) {
      updateFields.push(`rest_time = $${paramIndex++}`);
      updateValues.push(rest_time);
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateValues.push(notes);
    }

    if (updateFields.length > 0) {
      updateValues.push(exerciseId, routineId);
      const { rows } = await query(
        `UPDATE routine_exercises SET ${updateFields.join(", ")}
         WHERE id = $${paramIndex} AND routine_id = $${paramIndex + 1}
         RETURNING *`,
        updateValues
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Exercice non trouvé" }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    }

    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/routines/[id]/exercises/[exerciseId] error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

// Delete an exercise from a routine
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id: routineId, exerciseId } = await params;

    // Check routine ownership
    const { rows: routineRows } = await query(
      `SELECT id FROM user_routines WHERE id = $1 AND user_id = $2`,
      [routineId, userId]
    );

    if (routineRows.length === 0) {
      return NextResponse.json({ error: "Routine non trouvée" }, { status: 404 });
    }

    const result = await query(
      `DELETE FROM routine_exercises WHERE id = $1 AND routine_id = $2 RETURNING id`,
      [exerciseId, routineId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Exercice non trouvé" }, { status: 404 });
    }

    // Reorder remaining exercises
    await query(
      `WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_pos
        FROM routine_exercises
        WHERE routine_id = $1
      )
      UPDATE routine_exercises re
      SET position = o.new_pos
      FROM ordered o
      WHERE re.id = o.id`,
      [routineId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/routines/[id]/exercises/[exerciseId] error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
