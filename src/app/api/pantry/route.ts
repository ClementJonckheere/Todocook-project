import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export async function GET(request: NextRequest) {
  const db = getDb();
  seedDatabase();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "1";

  const items = db.prepare(`
    SELECT pi.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.category, i.image_url, i.barcode
    FROM pantry_items pi
    JOIN ingredients i ON pi.ingredient_id = i.id
    WHERE pi.user_id = ?
    ORDER BY i.category, i.name
  `).all(userId);

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { user_id, ingredient_id, quantity, unit } = body;

  // Upsert: if already in pantry, update quantity
  const existing = db.prepare(
    "SELECT * FROM pantry_items WHERE user_id = ? AND ingredient_id = ?"
  ).get(user_id || 1, ingredient_id) as any;

  if (existing) {
    db.prepare(
      "UPDATE pantry_items SET quantity = quantity + ?, unit = COALESCE(?, unit) WHERE id = ?"
    ).run(quantity || 1, unit, existing.id);
  } else {
    db.prepare(
      "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)"
    ).run(user_id || 1, ingredient_id, quantity || 1, unit || "g");
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    db.prepare("DELETE FROM pantry_items WHERE id = ?").run(id);
  }

  return NextResponse.json({ success: true });
}
