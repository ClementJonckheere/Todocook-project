import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST duplicate a shopping list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = params;

    // Get original list (with ownership check)
    const { rows: lists } = await query(
      `SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (lists.length === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    const original = lists[0];

    // Create duplicate list
    const { rows: newLists } = await query(
      `INSERT INTO shopping_lists (user_id, title) VALUES ($1, $2) RETURNING *`,
      [userId, `${original.title} (copie)`]
    );

    const newList = newLists[0];

    // Copy all items (unchecked)
    const { rows: items } = await query(
      `SELECT name FROM shopping_list_items WHERE list_id = $1`,
      [id]
    );

    for (const item of items) {
      await query(
        `INSERT INTO shopping_list_items (list_id, name, checked) VALUES ($1, $2, false)`,
        [newList.id, item.name]
      );
    }

    // Get items for response
    const { rows: newItems } = await query(
      `SELECT * FROM shopping_list_items WHERE list_id = $1 ORDER BY created_at ASC`,
      [newList.id]
    );

    return NextResponse.json({
      ...newList,
      items: newItems,
      total_items: newItems.length,
      checked_items: 0
    });
  } catch (error) {
    console.error("POST /api/shopping-lists/[id]/duplicate error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
