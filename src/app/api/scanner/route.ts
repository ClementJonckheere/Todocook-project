import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
      return NextResponse.json({ error: "Code-barres requis" }, { status: 400 });
    }

    if (barcode.length > 50) {
      return NextResponse.json({ error: "Code-barres invalide" }, { status: 400 });
    }

    // First check local database
    const { rows: localRows } = await query("SELECT * FROM ingredients WHERE barcode = $1", [barcode]);
    if (localRows.length > 0) {
      return NextResponse.json({ source: "local", product: localRows[0] });
    }

    // Then check OpenFoodFacts API
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
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
      await query(
        `INSERT INTO ingredients (name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (barcode) DO NOTHING`,
        [product.name, product.barcode, product.calories, product.protein, product.carbs, product.fat, product.fiber, product.unit, product.image_url, product.brand, product.category]
      );

      const { rows: saved } = await query("SELECT * FROM ingredients WHERE barcode = $1", [barcode]);

      return NextResponse.json({ source: "openfoodfacts", product: saved[0] });
    }

    return NextResponse.json({ source: "not_found", product: null }, { status: 404 });
  } catch (error) {
    console.error("GET /api/scanner error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche du produit" },
      { status: 500 }
    );
  }
}
