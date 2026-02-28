import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { validateRequired, validateMaxLength } from "@/lib/validation";

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

    // Get routine
    const { rows: routineRows } = await query(
      `SELECT * FROM user_routines WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (routineRows.length === 0) {
      return NextResponse.json({ error: "Routine non trouvée" }, { status: 404 });
    }

    const routine = routineRows[0];

    // Get exercises in this routine
    const { rows: exercises } = await query(
      `SELECT
        re.*,
        e.name as exercise_name,
        e.description as exercise_description,
        e.muscle_group,
        e.secondary_muscles,
        e.difficulty,
        e.instructions,
        e.rest_time_light,
        e.rest_time_moderate,
        e.rest_time_heavy,
        ARRAY_AGG(DISTINCT eq.name) FILTER (WHERE eq.name IS NOT NULL) as equipment_names
      FROM routine_exercises re
      JOIN exercises e ON re.exercise_id = e.id
      LEFT JOIN exercise_equipment ee ON e.id = ee.exercise_id
      LEFT JOIN equipment eq ON ee.equipment_id = eq.id
      WHERE re.routine_id = $1
      GROUP BY re.id, e.id
      ORDER BY re.position`,
      [id]
    );

    return NextResponse.json({ ...routine, exercises });
  } catch (error) {
    console.error("GET /api/routines/[id] error:", error);
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
    const { name, description, days_of_week, is_active, exercises } = body;

    // Check ownership
    const { rows: existingRows } = await query(
      `SELECT id FROM user_routines WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Routine non trouvée" }, { status: 404 });
    }

    // Update routine
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      const errors = [
        ...validateRequired({ name }, ["name"]),
        ...validateMaxLength(name, "name", 100),
      ];
      if (errors.length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description);
    }

    if (days_of_week !== undefined) {
      updateFields.push(`days_of_week = $${paramIndex++}`);
      updateValues.push(days_of_week);
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(is_active);
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);
      await query(
        `UPDATE user_routines SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    // Update exercises if provided
    if (exercises !== undefined) {
      // Delete existing exercises
      await query(`DELETE FROM routine_exercises WHERE routine_id = $1`, [id]);

      // Add new exercises
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await query(
          `INSERT INTO routine_exercises (routine_id, exercise_id, position, sets, reps, weight, rest_time, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, ex.exercise_id, i + 1, ex.sets || 3, ex.reps || 10, ex.weight || 0, ex.rest_time || 90, ex.notes || null]
        );
      }
    }

    // Return updated routine
    const { rows } = await query(`SELECT * FROM user_routines WHERE id = $1`, [id]);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("PUT /api/routines/[id] error:", error);
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
      `DELETE FROM user_routines WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Routine non trouvée" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/routines/[id] error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
