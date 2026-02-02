import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export async function GET(request: NextRequest) {
  const db = getDb();
  seedDatabase();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";
  const days = parseInt(searchParams.get("days") || "30");

  const logs = db.prepare(`
    SELECT * FROM daily_logs
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT ?
  `).all(userId, days);

  return NextResponse.json(logs);
}
