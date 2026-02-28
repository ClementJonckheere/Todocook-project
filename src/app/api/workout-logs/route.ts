import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const routineId = searchParams.get("routineId");

    let sql = `
      SELECT
        wl.*,
        ur.name as routine_name,
        COUNT(DISTINCT wel.id) as exercise_logs_count,
        COUNT(DISTINCT CASE WHEN wel.completed THEN wel.id END) as completed_exercises
      FROM workout_logs wl
      LEFT JOIN user_routines ur ON wl.routine_id = ur.id
      LEFT JOIN workout_exercise_logs wel ON wl.id = wel.workout_log_id
      WHERE wl.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      sql += ` AND wl.date >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND wl.date <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (routineId) {
      sql += ` AND wl.routine_id = $${paramIndex++}`;
      params.push(routineId);
    }

    sql += ` GROUP BY wl.id, ur.name ORDER BY wl.date DESC, wl.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/workout-logs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json();
    const { routine_id, date, notes } = body;

    const { rows } = await query(
      `INSERT INTO workout_logs (user_id, routine_id, date, notes, completed)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      [userId, routine_id || null, date, notes || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/workout-logs error:", error);
    return NextResponse.json({ error: "Erreur lors de la création du log" }, { status: 500 });
  }
}
