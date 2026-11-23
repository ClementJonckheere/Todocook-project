import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const mealFields = `mp.*, r.name AS recipe_name, COALESCE((mp.nutrition_per_portion->>'calories')::float8, r.calories / GREATEST(r.servings, 1)) AS calories,
          COALESCE((mp.nutrition_per_portion->>'protein')::float8, r.protein / GREATEST(r.servings, 1)) AS protein,
          COALESCE((mp.nutrition_per_portion->>'carbs')::float8, r.carbs / GREATEST(r.servings, 1)) AS carbs,
          COALESCE((mp.nutrition_per_portion->>'fat')::float8, r.fat / GREATEST(r.servings, 1)) AS fat,
          r.image_url, r.prep_time, r.cook_time, r.servings`;

export async function GET(request: NextRequest) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let result;
    if (startDate && endDate) {
      result = await query(
        `SELECT ${mealFields}
         FROM meal_plans mp
         JOIN recipes r ON mp.recipe_id = r.id
         WHERE mp.user_id = $1 AND mp.date >= $2 AND mp.date <= $3
         ORDER BY mp.date, mp.meal_type`,
        [userId, startDate, endDate]
      );
    } else {
      result = await query(
        `SELECT ${mealFields}
         FROM meal_plans mp
         JOIN recipes r ON mp.recipe_id = r.id
         WHERE mp.user_id = $1
         ORDER BY mp.date DESC, mp.meal_type
         LIMIT 50`,
        [userId]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/meal-plans error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json();
    const { recipe_id, date, meal_type } = body;

    if (!recipe_id || !date) {
      return NextResponse.json({ error: "recipe_id et date sont requis" }, { status: 400 });
    }

    const { rows: planRows } = await query(
      `INSERT INTO meal_plans (user_id, recipe_id, date, meal_type)
       SELECT $1::integer, id, $3, $4 FROM recipes WHERE id = $2 AND (is_public OR created_by = $1) RETURNING id`,
      [userId, recipe_id, date, meal_type || "dejeuner"]
    );
    if (!planRows.length) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
    const planId = planRows[0].id;

    const { rows } = await query(
      `SELECT ${mealFields}
       FROM meal_plans mp
       JOIN recipes r ON mp.recipe_id = r.id
       WHERE mp.id = $1`,
      [planId]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/meal-plans error:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout du repas" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const { id, portions } = await request.json();
    if (!Number.isSafeInteger(id) || !Number.isFinite(portions) || portions < 0 || portions > 100) {
      return NextResponse.json({ error: "Portion invalide" }, { status: 400 });
    }
    const result = await query(
      `UPDATE meal_plans mp SET consumed_portions = $3,
        nutrition_per_portion = CASE WHEN $3::float8 = 0 THEN NULL ELSE
          COALESCE(mp.nutrition_per_portion, jsonb_build_object(
            'calories', r.calories / GREATEST(r.servings, 1),
            'protein', r.protein / GREATEST(r.servings, 1),
            'carbs', r.carbs / GREATEST(r.servings, 1),
            'fat', r.fat / GREATEST(r.servings, 1)
          )) END
       FROM recipes r WHERE mp.recipe_id = r.id AND mp.id = $1 AND mp.user_id = $2`,
      [id, user.id, portions]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Repas introuvable" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
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

    const result = await query("DELETE FROM meal_plans WHERE id = $1 AND user_id = $2 AND consumed_portions = 0", [id, authUser.id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Repas non trouvé" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/meal-plans error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
