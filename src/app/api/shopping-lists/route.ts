import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET all shopping lists for a user (sorted by updated_at DESC)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

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

    if (lists.length === 0) {
      return NextResponse.json(lists);
    }

    // Batch-fetch all items for the user's lists in a single query
    const listIds = lists.map((l: { id: number }) => l.id);
    const { rows: allItems } = await query(
      `SELECT * FROM shopping_list_items WHERE list_id = ANY($1) ORDER BY created_at ASC`,
      [listIds]
    );

    // Group items by list_id
    const itemsByList = new Map<number, typeof allItems>();
    for (const item of allItems) {
      if (!itemsByList.has(item.list_id)) {
        itemsByList.set(item.list_id, []);
      }
      itemsByList.get(item.list_id)!.push(item);
    }

    for (const list of lists) {
      list.items = itemsByList.get(list.id) || [];
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
    const authUser = await getAuthUser(request);
    const body = await request.json();
    const { title } = body;
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    }

    if (title.trim().length > 200) {
      return NextResponse.json({ error: "Le titre ne peut pas dépasser 200 caractères" }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO shopping_lists (user_id, title) VALUES ($1, $2) RETURNING *`,
      [userId, title.trim()]
    );

    return NextResponse.json({ ...rows[0], items: [], total_items: 0, checked_items: 0 });
  } catch (error) {
    console.error("POST /api/shopping-lists error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
