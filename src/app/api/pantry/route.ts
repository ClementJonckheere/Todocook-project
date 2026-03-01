import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { findMatchingIngredients, calculateSimilarity } from "@/lib/ingredient-matcher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;

    const { rows } = await query(
      `SELECT pi.*, i.name, i.calories, i.protein, i.carbs, i.fat, i.category, i.image_url, i.barcode
       FROM pantry_items pi
       JOIN ingredients i ON pi.ingredient_id = i.id
       WHERE pi.user_id = $1
       ORDER BY i.category, i.name`,
      [userId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/pantry error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json();
    const { ingredient_id, quantity, unit } = body;

    if (!ingredient_id) {
      return NextResponse.json({ error: "ingredient_id est requis" }, { status: 400 });
    }

    // Add the scanned product to pantry
    const { rows: existing } = await query(
      "SELECT * FROM pantry_items WHERE user_id = $1 AND ingredient_id = $2",
      [userId, ingredient_id]
    );

    if (existing.length > 0) {
      await query(
        "UPDATE pantry_items SET quantity = quantity + $1, unit = COALESCE($2, unit) WHERE id = $3",
        [quantity || 1, unit, existing[0].id]
      );
    } else {
      await query(
        "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)",
        [userId, ingredient_id, quantity || 1, unit || "g"]
      );
    }

    // Get the scanned product details for matching
    const { rows: productRows } = await query(
      "SELECT name, category, brand FROM ingredients WHERE id = $1",
      [ingredient_id]
    );

    const matchedIngredients: string[] = [];

    if (productRows.length > 0) {
      const product = productRows[0];

      // Find matching base ingredients by keywords
      const matchingNames = findMatchingIngredients(
        product.name,
        product.category,
        product.brand
      );

      if (matchingNames.length > 0) {
        // Get all base ingredients (those without barcode = recipe ingredients)
        const { rows: baseIngredients } = await query(
          "SELECT id, name FROM ingredients WHERE barcode IS NULL"
        );

        for (const matchName of matchingNames) {
          // Find the best matching base ingredient
          for (const baseIng of baseIngredients) {
            const similarity = calculateSimilarity(matchName, baseIng.name);
            if (similarity > 0.5) {
              // Check if not already in pantry
              const { rows: existingBase } = await query(
                "SELECT id FROM pantry_items WHERE user_id = $1 AND ingredient_id = $2",
                [userId, baseIng.id]
              );

              if (existingBase.length === 0) {
                // Add the base ingredient to pantry
                await query(
                  "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)",
                  [userId, baseIng.id, 1, "unite"]
                );
                matchedIngredients.push(baseIng.name);
              }
              break;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      matchedBaseIngredients: matchedIngredients,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/pantry error:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout au garde-manger" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id est requis" }, { status: 400 });
    }

    const result = await query("DELETE FROM pantry_items WHERE id = $1 AND user_id = $2", [id, authUser.id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/pantry error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
