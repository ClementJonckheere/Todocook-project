import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST check all items in a shopping list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await query(
      `UPDATE shopping_list_items SET checked = true WHERE list_id = $1`,
      [id]
    );

    // Update list's updated_at
    await query(`UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/shopping-lists/[id]/check-all error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
