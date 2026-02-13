import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET a single shopping list with items
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { rows: lists } = await query(
      `SELECT * FROM shopping_lists WHERE id = $1`,
      [id]
    );

    if (lists.length === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }

    const { rows: items } = await query(
      `SELECT * FROM shopping_list_items WHERE list_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({ ...lists[0], items });
  } catch (error) {
    console.error("GET /api/shopping-lists/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT update a shopping list (title or touch updated_at)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title } = body;

    if (title !== undefined) {
      await query(
        `UPDATE shopping_lists SET title = $1, updated_at = NOW() WHERE id = $2`,
        [title.trim(), id]
      );
    } else {
      // Just touch updated_at
      await query(
        `UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1`,
        [id]
      );
    }

    const { rows } = await query(`SELECT * FROM shopping_lists WHERE id = $1`, [id]);
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("PUT /api/shopping-lists/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE a shopping list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await query(`DELETE FROM shopping_lists WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shopping-lists/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
