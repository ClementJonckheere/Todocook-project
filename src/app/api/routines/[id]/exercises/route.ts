import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Add an exercise to a routine
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id: routineId } = await params;
    const body = await request.json();
    const { exercise_id, sets, reps, weight, rest_time, notes } = body;

    // Check routine ownership
    const { rows: routineRows } = await query(
      `SELECT id FROM user_routines WHERE id = $1 AND user_id = $2`,
      [routineId, userId]
    );

    if (routineRows.length === 0) {
      return NextResponse.json({ error: "Routine non trouvée" }, { status: 404 });
    }

    // Get max position
    const { rows: posRows } = await query(
      `SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM routine_exercises WHERE routine_id = $1`,
      [routineId]
    );
    const nextPosition = posRows[0].next_position;

    // Add exercise
    const { rows } = await query(
      `INSERT INTO routine_exercises (routine_id, exercise_id, position, sets, reps, weight, rest_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [routineId, exercise_id, nextPosition, sets || 3, reps || 10, weight || 0, rest_time || 90, notes || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/routines/[id]/exercises error:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout de l'exercice" }, { status: 500 });
  }
}

// Update exercise order in routine
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id: routineId } = await params;
    const body = await request.json();
    const { exercise_order } = body; // Array of routine_exercise ids in new order

    // Check routine ownership
    const { rows: routineRows } = await query(
      `SELECT id FROM user_routines WHERE id = $1 AND user_id = $2`,
      [routineId, userId]
    );

    if (routineRows.length === 0) {
      return NextResponse.json({ error: "Routine non trouvée" }, { status: 404 });
    }

    // Update positions
    for (let i = 0; i < exercise_order.length; i++) {
      await query(
        `UPDATE routine_exercises SET position = $1 WHERE id = $2 AND routine_id = $3`,
        [i + 1, exercise_order[i], routineId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/routines/[id]/exercises error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'ordre" }, { status: 500 });
  }
}
