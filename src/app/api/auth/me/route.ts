import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await seedDatabase();
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [user.id]);
    if (rows.length === 0) {
      return NextResponse.json(null, { status: 401 });
    }

    const userData = rows[0];
    delete userData.password_hash;
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
