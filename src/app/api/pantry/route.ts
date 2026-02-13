import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;

    const { rows } = await query(
      `SELECT pi.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.category, i.image_url, i.barcode
       FROM pantry_items pi
       JOIN ingredients i ON pi.ingredient_id = i.id
       WHERE pi.user_id = $1
       ORDER BY i.category, i.name`,
      [userId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/pantry error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    const userId = authUser?.id || 1;
    const body = await request.json();
    const { ingredient_id, quantity, unit } = body;

    if (!ingredient_id) {
      return NextResponse.json({ error: "ingredient_id est requis" }, { status: 400 });
    }

    const { rows: existing } = await query(
      "SELECT * FROM pantry_items WHERE user_id = $1 AND ingredient_id = $2",
      [userId, ingredient_id]
    );

    if (existing.length > 0) {
      await query(
        "UPDATE pantry_items SET quantity = quantity + $1, unit = COALESCE($2, unit) WHERE id = $3",
        [quantity || 1, unit, existing[0].id]
      );
    } else {
      await query(
        "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)",
        [userId, ingredient_id, quantity || 1, unit || "g"]
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/pantry error:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout au garde-manger" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id est requis" }, { status: 400 });
    }

    await query("DELETE FROM pantry_items WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/pantry error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
