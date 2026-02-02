import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(params.id);
  if (!recipe) {
    return NextResponse.json({ error: "Recette non trouvée" }, { status: 404 });
  }

  const ingredients = db.prepare(`
    SELECT ri.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.unit as ingredient_unit
    FROM recipe_ingredients ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = ?
  `).all(params.id);

  return NextResponse.json({ ...recipe, ingredients });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare("DELETE FROM recipes WHERE id = ?").run(params.id);
  return NextResponse.json({ success: true });
}
