import { NextRequest, NextResponse } from "next/server";
import { journalDate } from "@/lib/food-journal";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const day = searchParams.get("date");
    if (day !== null) {
      if (!journalDate(day)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
      const result = await query("SELECT * FROM consumed_daily_totals WHERE user_id = $1 AND date = $2", [userId, day]);
      return NextResponse.json(result.rows);
    }
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30") || 30, 1), 365);

    const { rows } = await query(
      `SELECT * FROM consumed_daily_totals
       WHERE user_id = $1 AND date BETWEEN CURRENT_DATE - ($2::integer - 1) AND CURRENT_DATE
       ORDER BY date DESC`,
      [userId, days]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/daily-logs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
