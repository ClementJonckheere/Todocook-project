import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST add an item to a shopping list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    if (name.trim().length > 200) {
      return NextResponse.json({ error: "Le nom ne peut pas dépasser 200 caractères" }, { status: 400 });
    }

    // Verify list ownership
    const { rows: lists } = await query(
      `SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (lists.length === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
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
