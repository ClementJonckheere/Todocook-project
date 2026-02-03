import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await seedDatabase();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";

  const { rows } = await query(
    `SELECT pi.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.category, i.image_url, i.barcode
     FROM pantry_items pi
     JOIN ingredients i ON pi.ingredient_id = i.id
     WHERE pi.user_id = $1
     ORDER BY i.category, i.name`,
    [userId]
  );

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, ingredient_id, quantity, unit } = body;

  // Upsert: if already in pantry, update quantity
  const { rows: existing } = await query(
    "SELECT * FROM pantry_items WHERE user_id = $1 AND ingredient_id = $2",
    [user_id || 1, ingredient_id]
  );

  if (existing.length > 0) {
    await query(
      "UPDATE pantry_items SET quantity = quantity + $1, unit = COALESCE($2, unit) WHERE id = $3",
      [quantity || 1, unit, existing[0].id]
    );
  } else {
    await query(
      "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)",
      [user_id || 1, ingredient_id, quantity || 1, unit || "g"]
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    await query("DELETE FROM pantry_items WHERE id = $1", [id]);
  }

  return NextResponse.json({ success: true });
}
