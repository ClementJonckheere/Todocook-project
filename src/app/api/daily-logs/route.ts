import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const days = parseInt(searchParams.get("days") || "30");

    const { rows } = await query(
      `SELECT * FROM daily_logs
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [userId, days]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/daily-logs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
