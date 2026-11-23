import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });

  const { rows } = await query(
    `SELECT i.id, i.name, i.brand, (x.ingredient_id IS NOT NULL) AS excluded
     FROM ingredients i
     LEFT JOIN dinner_exclusions x ON x.ingredient_id = i.id AND x.user_id = $1
     WHERE x.ingredient_id IS NOT NULL OR EXISTS (
       SELECT 1 FROM recipe_ingredients ri JOIN recipes r ON r.id = ri.recipe_id
       WHERE ri.ingredient_id = i.id AND (r.is_public OR r.created_by = $1)
     )
     ORDER BY i.name, i.brand, i.id`, [user.id]
  );
  return NextResponse.json(rows);
}

export async function PUT(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!Number.isSafeInteger(body?.id) || body.id <= 0 || typeof body.excluded !== "boolean") {
    return NextResponse.json({ error: "Préférence invalide." }, { status: 400 });
  }
  if (body.excluded) {
    const result = await query(
      `INSERT INTO dinner_exclusions(user_id, ingredient_id)
       SELECT $1, id FROM ingredients WHERE id = $2
       ON CONFLICT (user_id, ingredient_id) DO UPDATE SET ingredient_id = EXCLUDED.ingredient_id
       RETURNING ingredient_id`, [user.id, body.id]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Ingrédient introuvable." }, { status: 404 });
  } else {
    await query("DELETE FROM dinner_exclusions WHERE user_id = $1 AND ingredient_id = $2", [user.id, body.id]);
  }
  return NextResponse.json({ id: body.id, excluded: body.excluded });
}
