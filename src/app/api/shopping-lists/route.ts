import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET all shopping lists for a user (sorted by updated_at DESC)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "1";

    const { rows: lists } = await query(
      `SELECT
        sl.*,
        COALESCE(COUNT(sli.id), 0) as total_items,
        COALESCE(SUM(CASE WHEN sli.checked THEN 1 ELSE 0 END), 0) as checked_items
      FROM shopping_lists sl
      LEFT JOIN shopping_list_items sli ON sl.id = sli.list_id
      WHERE sl.user_id = $1
      GROUP BY sl.id
      ORDER BY sl.updated_at DESC`,
      [userId]
    );

    // Get items for each list
    for (const list of lists) {
      const { rows: items } = await query(
        `SELECT * FROM shopping_list_items WHERE list_id = $1 ORDER BY created_at ASC`,
        [list.id]
      );
      list.items = items;
    }

    return NextResponse.json(lists);
  } catch (error) {
    console.error("GET /api/shopping-lists error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST create a new shopping list
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id = 1, title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO shopping_lists (user_id, title) VALUES ($1, $2) RETURNING *`,
      [user_id, title.trim()]
    );

    return NextResponse.json({ ...rows[0], items: [], total_items: 0, checked_items: 0 });
  } catch (error) {
    console.error("POST /api/shopping-lists error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
