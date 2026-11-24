import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { validateMaxLength, validateRequired } from "@/lib/validation";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!(await getAuthUser())) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const id = searchParams.get("id");

    let result;
    if (id !== null) {
      const ingredientId = Number(id);
      if (!Number.isSafeInteger(ingredientId) || ingredientId <= 0 || ingredientId > 2147483647) {
        return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
      }
      result = await query("SELECT * FROM ingredients WHERE id = $1", [ingredientId]);
    } else if (search) {
      result = await query(
        "SELECT * FROM ingredients WHERE name ILIKE $1 OR brand ILIKE $1 ORDER BY name LIMIT 50",
        [`%${search}%`]
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

const NUTRIENTS = ["calories", "protein", "carbs", "fat", "fiber"] as const;

export async function POST(request: Request) {
  try {
    if (!(await getAuthUser())) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const { name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category } = body;

    const errors = [
      ...validateRequired({ name }, ["name"]),
      ...validateMaxLength(name, "name", 200),
      ...validateMaxLength(brand, "brand", 200),
      ...validateMaxLength(category, "category", 100),
      ...validateMaxLength(unit, "unit", 20),
      ...validateMaxLength(barcode, "barcode", 50),
      ...validateMaxLength(image_url, "image_url", 2000),
    ];
    for (const field of NUTRIENTS) {
      const value = body[field];
      if (value != null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1000)) {
        errors.push({ field, message: `${field} doit être un nombre entre 0 et 1000 (pour 100 g)` });
      }
    }
    if (image_url && !/^https:\/\//.test(image_url)) {
      errors.push({ field: "image_url", message: "L'image doit être une URL https" });
    }
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

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
