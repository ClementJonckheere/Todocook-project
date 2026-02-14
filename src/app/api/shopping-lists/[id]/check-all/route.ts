import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST check all items in a shopping list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = params;

    // Verify ownership
    const { rows: lists } = await query(
      `SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (lists.length === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    await query(
      `UPDATE shopping_list_items SET checked = true WHERE list_id = $1`,
      [id]
    );

    await query(`UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/shopping-lists/[id]/check-all error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
