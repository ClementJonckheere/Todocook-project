import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT toggle checked status of an item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id, itemId } = params;
    const body = await request.json();
    const { checked } = body;

    if (typeof checked !== "boolean") {
      return NextResponse.json({ error: "checked doit être un booléen" }, { status: 400 });
    }

    // Verify list ownership
    const { rows: lists } = await query(
      `SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (lists.length === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    const result = await query(
      `UPDATE shopping_list_items SET checked = $1 WHERE id = $2 AND list_id = $3`,
      [checked, itemId, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    // Update list's updated_at
    await query(`UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1`, [id]);

    const { rows } = await query(`SELECT * FROM shopping_list_items WHERE id = $1`, [itemId]);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("PUT /api/shopping-lists/[id]/items/[itemId] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE an item from a shopping list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id, itemId } = params;

    // Verify list ownership
    const { rows: lists } = await query(
      `SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (lists.length === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    await query(`DELETE FROM shopping_list_items WHERE id = $1 AND list_id = $2`, [itemId, id]);

    // Update list's updated_at
    await query(`UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shopping-lists/[id]/items/[itemId] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
