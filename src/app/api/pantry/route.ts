import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { parseJsonBody, parseQuery } from "@/lib/api-validation";
import { idQuerySchema, pantryAddSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

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
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const parsed = await parseJsonBody(request, pantryAddSchema);
    if (parsed.response) return parsed.response;
    const { ingredient_id, quantity, unit } = parsed.data;

    const { rowCount: ingredientExists } = await query("SELECT 1 FROM ingredients WHERE id = $1", [ingredient_id]);
    if (!ingredientExists) {
      return NextResponse.json({ error: "Ingrédient introuvable" }, { status: 404 });
    }

    const { rows: existing } = await query(
      "SELECT * FROM pantry_items WHERE user_id = $1 AND ingredient_id = $2",
      [userId, ingredient_id]
    );

    if (existing.length > 0) {
      await query(
        "UPDATE pantry_items SET quantity = quantity + $1, unit = COALESCE($2, unit) WHERE id = $3",
        [quantity ?? 1, unit ?? null, existing[0].id]
      );
    } else {
      await query(
        "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)",
        [userId, ingredient_id, quantity ?? 1, unit ?? "g"]
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
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });

    const parsed = parseQuery(request, idQuerySchema);
    if (parsed.response) return parsed.response;
    const { id } = parsed.data;

    const result = await query("DELETE FROM pantry_items WHERE id = $1 AND user_id = $2", [id, authUser.id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/pantry error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
