import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30") || 30, 1), 365);

    const { rows } = await query(
      `SELECT * FROM consumed_daily_totals
       WHERE user_id = $1 AND date BETWEEN (CURRENT_DATE - ($2::integer - 1))::text AND CURRENT_DATE::text
       ORDER BY date DESC`,
      [userId, days]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/daily-logs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
