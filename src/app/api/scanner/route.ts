import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { parseQuery } from "@/lib/api-validation";
import { barcodeQuerySchema } from "@/lib/schemas";
import { hasNutrition, lookupOffProduct } from "@/lib/open-food-facts";

export const dynamic = "force-dynamic";

/**
 * Recherche un produit par code-barres : catalogue local d'abord, puis Open Food Facts
 * (le produit trouvé y est enregistré). `nutrition_complete` indique si calories, protéines,
 * glucides et lipides sont connus ; sinon le produit ne peut pas être ajouté au journal.
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await getAuthUser())) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const parsed = parseQuery(request, barcodeQuerySchema);
    if (parsed.response) return parsed.response;
    const { barcode } = parsed.data;

    const { rows: localRows } = await query("SELECT * FROM ingredients WHERE barcode = $1", [barcode]);
    if (localRows.length > 0) {
      return NextResponse.json({ source: "local", product: localRows[0], nutrition_complete: hasNutrition(localRows[0]) });
    }

    const lookup = await lookupOffProduct(barcode);
    if (lookup.status === "unavailable") {
      console.warn(`Open Food Facts indisponible pour ${barcode} : ${lookup.reason}`);
      return NextResponse.json(
        { error: "Open Food Facts est injoignable pour le moment. Réessayez plus tard ou cherchez l'aliment par son nom." },
        { status: 503 }
      );
    }
    if (lookup.status === "not_found") {
      return NextResponse.json(
        { source: "not_found", product: null, error: "Produit introuvable pour ce code-barres." },
        { status: 404 }
      );
    }

    const p = lookup.product;
    await query(
      `INSERT INTO ingredients (name, barcode, calories, protein, carbs, fat, fiber, unit, image_url, brand, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'g', $8, $9, $10)
       ON CONFLICT (barcode) DO NOTHING`,
      [p.name, barcode, p.calories, p.protein, p.carbs, p.fat, p.fiber, p.image_url, p.brand, p.category]
    );
    const { rows: saved } = await query("SELECT * FROM ingredients WHERE barcode = $1", [barcode]);
    return NextResponse.json({ source: "openfoodfacts", product: saved[0], nutrition_complete: hasNutrition(saved[0]) });
  } catch (error) {
    console.error("GET /api/scanner error:", error);
    return NextResponse.json({ error: "Erreur lors de la recherche du produit" }, { status: 500 });
  }
}
