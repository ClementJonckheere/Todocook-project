import { NextResponse } from "next/server";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { query } from "@/lib/db";
import { journalDate, validFoodAmount, validMeal } from "@/lib/food-journal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const day = new URL(request.url).searchParams.get("date");
  if (!journalDate(day)) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  const result = await query(
    `SELECT id, name, brand, grams, meal_type, calories_100g, protein_100g, carbs_100g, fat_100g
     FROM food_journal WHERE user_id = $1 AND date = $2 ORDER BY id`, [user.id, day]
  );
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!journalDate(body?.date) || !validMeal(body.meal_type) || !validFoodAmount(body.grams) ||
      !Number.isSafeInteger(body.ingredient_id) || body.ingredient_id <= 0 ||
      typeof body.entry_key !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.entry_key)) {
    return NextResponse.json({ error: "Vérifiez l’aliment, la date et la quantité." }, { status: 400 });
  }
  const params = [user.id, body.entry_key, body.date, body.meal_type, body.grams, body.ingredient_id];
  const inserted = await query(
    `INSERT INTO food_journal(user_id, entry_key, date, meal_type, grams, ingredient_id, name, brand,
        calories_100g, protein_100g, carbs_100g, fat_100g)
     SELECT $1, $2, $3, $4, $5, id, name, brand, calories, protein, carbs, fat
     FROM ingredients WHERE id = $6 AND calories IS NOT NULL AND protein IS NOT NULL
       AND carbs IS NOT NULL AND fat IS NOT NULL
     ON CONFLICT (user_id, entry_key) DO NOTHING RETURNING id`, params
  );
  if (inserted.rowCount) return NextResponse.json(inserted.rows[0], { status: 201 });
  const previous = await query(
    "SELECT id FROM food_journal WHERE user_id=$1 AND entry_key=$2 AND date=$3 AND meal_type=$4 AND grams=$5 AND ingredient_id=$6", params
  );
  if (previous.rowCount) return NextResponse.json(previous.rows[0]);
  return NextResponse.json({ error: "Aliment indisponible ou saisie déjà modifiée." }, { status: 409 });
}

export async function PATCH(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!Number.isSafeInteger(body?.id) || !validFoodAmount(body.grams) || !validMeal(body.meal_type)) {
    return NextResponse.json({ error: "Vérifiez le repas et la quantité." }, { status: 400 });
  }
  const result = await query("UPDATE food_journal SET grams=$3, meal_type=$4 WHERE user_id=$1 AND id=$2",
    [user.id, body.id, body.grams, body.meal_type]);
  if (!result.rowCount) return NextResponse.json({ error: "Aliment introuvable." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  await query("DELETE FROM food_journal WHERE user_id=$1 AND id=$2", [user.id, id]);
  return NextResponse.json({ success: true });
}
