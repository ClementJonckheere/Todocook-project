import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { findMatchingIngredients, calculateSimilarity } from "@/lib/ingredient-matcher";

export const dynamic = "force-dynamic";

/**
 * POST /api/pantry/rematch
 * Re-analyse tous les produits scannés du garde-manger avec le nouveau système de matching
 * et ajoute les ingrédients de base correspondants
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

    // Récupérer tous les produits scannés de l'utilisateur (avec barcode)
    const { rows: scannedProducts } = await query(
      `SELECT DISTINCT i.id, i.name, i.category, i.brand
       FROM pantry_items pi
       JOIN ingredients i ON pi.ingredient_id = i.id
       WHERE pi.user_id = $1 AND i.barcode IS NOT NULL`,
      [userId]
    );

    // Récupérer tous les ingrédients de base (sans barcode)
    const { rows: baseIngredients } = await query(
      "SELECT id, name FROM ingredients WHERE barcode IS NULL"
    );

    const results: Array<{
      product: string;
      matchedIngredients: string[];
      alreadyInPantry: string[];
      newlyAdded: string[];
    }> = [];

    for (const product of scannedProducts) {
      const productResult = {
        product: product.name,
        matchedIngredients: [] as string[],
        alreadyInPantry: [] as string[],
        newlyAdded: [] as string[],
      };

      // Trouver les ingrédients de base correspondants avec le nouveau matcher
      const matchingNames = findMatchingIngredients(
        product.name,
        product.category,
        product.brand
      );

      if (matchingNames.length > 0) {
        for (const matchName of matchingNames) {
          // Chercher l'ingrédient de base correspondant
          for (const baseIng of baseIngredients) {
            const similarity = calculateSimilarity(matchName, baseIng.name);
            if (similarity > 0.5) {
              productResult.matchedIngredients.push(baseIng.name);

              // Vérifier si déjà dans le garde-manger
              const { rows: existing } = await query(
                "SELECT id FROM pantry_items WHERE user_id = $1 AND ingredient_id = $2",
                [userId, baseIng.id]
              );

              if (existing.length > 0) {
                productResult.alreadyInPantry.push(baseIng.name);
              } else {
                // Ajouter au garde-manger
                await query(
                  "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)",
                  [userId, baseIng.id, 1, "unite"]
                );
                productResult.newlyAdded.push(baseIng.name);
              }
              break; // Un seul match par nom
            }
          }
        }
      }

      results.push(productResult);
    }

    // Compter les statistiques
    const totalNewlyAdded = results.reduce((sum, r) => sum + r.newlyAdded.length, 0);
    const totalAlreadyInPantry = results.reduce((sum, r) => sum + r.alreadyInPantry.length, 0);

    return NextResponse.json({
      success: true,
      message: `Re-matching terminé: ${totalNewlyAdded} nouveaux ingrédients ajoutés, ${totalAlreadyInPantry} déjà présents`,
      stats: {
        productsAnalyzed: scannedProducts.length,
        newlyAdded: totalNewlyAdded,
        alreadyInPantry: totalAlreadyInPantry,
      },
      details: results,
    });
  } catch (error) {
    console.error("POST /api/pantry/rematch error:", error);
    return NextResponse.json({ error: "Erreur lors du re-matching" }, { status: 500 });
  }
}
