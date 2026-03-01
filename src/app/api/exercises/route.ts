import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const muscleGroup = searchParams.get("muscle_group");
    const equipmentIds = searchParams.get("equipment");
    const difficulty = searchParams.get("difficulty");

    let sql = `
      SELECT DISTINCT e.*,
        ARRAY_AGG(DISTINCT eq.name) FILTER (WHERE eq.name IS NOT NULL) as equipment_names,
        ARRAY_AGG(DISTINCT eq.id) FILTER (WHERE eq.id IS NOT NULL) as equipment_ids
      FROM exercises e
      LEFT JOIN exercise_equipment ee ON e.id = ee.exercise_id
      LEFT JOIN equipment eq ON ee.equipment_id = eq.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (e.name ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.muscle_group ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (muscleGroup) {
      sql += ` AND e.muscle_group = $${paramIndex}`;
      params.push(muscleGroup);
      paramIndex++;
    }

    if (difficulty) {
      sql += ` AND e.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (equipmentIds) {
      const eqIds = equipmentIds.split(",").map(Number).filter(n => !isNaN(n));
      if (eqIds.length > 0) {
        sql += ` AND e.id IN (
          SELECT exercise_id FROM exercise_equipment WHERE equipment_id = ANY($${paramIndex}::int[])
        )`;
        params.push(eqIds);
        paramIndex++;
      }
    }

    sql += ` GROUP BY e.id ORDER BY e.muscle_group, e.name`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/exercises error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
