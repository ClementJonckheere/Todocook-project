import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export async function GET(request: NextRequest) {
  const db = getDb();
  seedDatabase();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let ingredients;
  if (search) {
    ingredients = db.prepare(
      "SELECT * FROM ingredients WHERE name LIKE ? OR brand LIKE ? ORDER BY name LIMIT 50"
    ).all(`%${search}%`, `%${search}%`);
  } else {
    ingredients = db.prepare("SELECT * FROM ingredients ORDER BY name").all();
  }

  return NextResponse.json(ingredients);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category } = body;

  const result = db.prepare(`
    INSERT INTO ingredients (name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, barcode || null, calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0, unit || "g", image_url || null, brand || null, category || null);

  const ingredient = db.prepare("SELECT * FROM ingredients WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(ingredient, { status: 201 });
}
