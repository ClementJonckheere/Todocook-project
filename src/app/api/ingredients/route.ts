import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { parseJsonBody, parseQuery } from "@/lib/api-validation";
import { ingredientCreateSchema, ingredientQuerySchema } from "@/lib/schemas";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { escapeLike } from "@/lib/sql";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!(await getAuthUser())) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const parsed = parseQuery(request, ingredientQuerySchema);
    if (parsed.response) return parsed.response;
    const { id, search } = parsed.data;

    let result;
    if (id !== undefined) {
      result = await query("SELECT * FROM ingredients WHERE id = $1", [id]);
    } else if (search) {
      result = await query(
        "SELECT * FROM ingredients WHERE name ILIKE $1 OR brand ILIKE $1 ORDER BY name LIMIT 50",
        [`%${escapeLike(search)}%`]
      );
    } else {
      result = await query("SELECT * FROM ingredients ORDER BY name");
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/ingredients error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getAuthUser())) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const parsed = await parseJsonBody(request, ingredientCreateSchema);
    if (parsed.response) return parsed.response;
    const { name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category } = parsed.data;

    const { rows } = await query(
      `INSERT INTO ingredients (name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, barcode || null, calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0, unit || "g", image_url || null, brand || null, category || null]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/ingredients error:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout de l'ingrédient" }, { status: 500 });
  }
}
