import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json({ error: "Code-barres requis" }, { status: 400 });
  }

  const db = getDb();

  // First check local database
  const local = db.prepare("SELECT * FROM ingredients WHERE barcode = ?").get(barcode);
  if (local) {
    return NextResponse.json({ source: "local", product: local });
  }

  // Then check OpenFoodFacts API
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const nutriments = p.nutriments || {};

      const product = {
        name: p.product_name_fr || p.product_name || "Produit inconnu",
        barcode: barcode,
        calories: nutriments["energy-kcal_100g"] || 0,
        protein: nutriments.proteins_100g || 0,
        carbs: nutriments.carbohydrates_100g || 0,
        fat: nutriments.fat_100g || 0,
        fiber: nutriments.fiber_100g || 0,
        unit: "g",
        image_url: p.image_url || null,
        brand: p.brands || null,
        category: p.categories_tags?.[0]?.replace("en:", "") || null,
      };

      // Save to local database
      db.prepare(`
        INSERT OR IGNORE INTO ingredients (name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        product.name, product.barcode, product.calories,
        product.protein, product.carbs, product.fat, product.fiber,
        product.unit, product.image_url, product.brand, product.category
      );

      const saved = db.prepare("SELECT * FROM ingredients WHERE barcode = ?").get(barcode);

      return NextResponse.json({ source: "openfoodfacts", product: saved });
    }

    return NextResponse.json({ source: "not_found", product: null }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la recherche du produit" },
      { status: 500 }
    );
  }
}
