import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET a single shopping list with items
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = params;

    const { rows: lists } = await query(
      `SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2`,
      [id, userId]
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
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = params;
    const body = await request.json();
    const { title } = body;

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: "Le titre ne peut pas être vide" }, { status: 400 });
      }
      if (title.trim().length > 200) {
        return NextResponse.json({ error: "Le titre ne peut pas dépasser 200 caractères" }, { status: 400 });
      }
      const result = await query(
        `UPDATE shopping_lists SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [title.trim(), id, userId]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
      }
    } else {
      await query(
        `UPDATE shopping_lists SET updated_at = NOW() WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    }

    const { rows } = await query(`SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }
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
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const { id } = params;
    const result = await query(`DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shopping-lists/[id] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
