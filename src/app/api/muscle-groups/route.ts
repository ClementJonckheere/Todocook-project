import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });

    const result = await query(`
      SELECT muscle_group, COUNT(*) as exercise_count
      FROM exercises
      GROUP BY muscle_group
      ORDER BY muscle_group
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/muscle-groups error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
