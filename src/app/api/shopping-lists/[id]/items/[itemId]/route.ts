import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT toggle checked status of an item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id, itemId } = params;
    const body = await request.json();
    const { checked } = body;

    await query(
      `UPDATE shopping_list_items SET checked = $1 WHERE id = $2 AND list_id = $3`,
      [checked, itemId, id]
    );

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
    const { id, itemId } = params;

    await query(`DELETE FROM shopping_list_items WHERE id = $1 AND list_id = $2`, [itemId, id]);

    // Update list's updated_at
    await query(`UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shopping-lists/[id]/items/[itemId] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
