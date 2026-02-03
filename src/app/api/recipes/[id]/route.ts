import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { rows: recipeRows } = await query("SELECT * FROM recipes WHERE id = $1", [params.id]);
  if (recipeRows.length === 0) {
    return NextResponse.json({ error: "Recette non trouvée" }, { status: 404 });
  }

  const { rows: ingredients } = await query(
    `SELECT ri.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.unit as ingredient_unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON ri.ingredient_id = i.id
     WHERE ri.recipe_id = $1`,
    [params.id]
  );

  return NextResponse.json({ ...recipeRows[0], ingredients });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await query("DELETE FROM recipes WHERE id = $1", [params.id]);
  return NextResponse.json({ success: true });
}
