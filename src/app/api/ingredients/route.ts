import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await seedDatabase();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let result;
  if (search) {
    result = await query(
      "SELECT * FROM ingredients WHERE name ILIKE $1 OR brand ILIKE $1 ORDER BY name LIMIT 50",
      [`%${search}%`]
    );
  } else {
    result = await query("SELECT * FROM ingredients ORDER BY name");
  }

  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category } = body;

  const { rows } = await query(
    `INSERT INTO ingredients (name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [name, barcode || null, calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0, unit || "g", image_url || null, brand || null, category || null]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
