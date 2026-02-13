import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST add an item to a shopping list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    // Add item
    const { rows } = await query(
      `INSERT INTO shopping_list_items (list_id, name) VALUES ($1, $2) RETURNING *`,
      [id, name.trim()]
    );

    // Update list's updated_at
    await query(`UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1`, [id]);

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("POST /api/shopping-lists/[id]/items error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
