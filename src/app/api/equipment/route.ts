import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });

    const result = await query(`
      SELECT e.*, COUNT(DISTINCT ee.exercise_id) as exercise_count
      FROM equipment e
      LEFT JOIN exercise_equipment ee ON e.id = ee.equipment_id
      GROUP BY e.id
      ORDER BY e.name
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/equipment error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
