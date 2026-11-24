import { NextRequest, NextResponse } from "next/server";
import { PoolClient } from "pg";
import { gramsPerUnit } from "@/lib/recipe-portions";
import { getPool, query } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { getAuthUser, UNAUTHENTICATED_RESPONSE } from "@/lib/auth";
import { validateRequired, validateMaxLength } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await seedDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const onlyUser = searchParams.get("onlyUser");

    let result;
    if (search) {
      result = await query(
        `SELECT r.*, STRING_AGG(i.name, ', ') as ingredient_names,
         COALESCE(AVG(rr.rating), 0) as avg_rating,
         COUNT(DISTINCT rr.id) as rating_count,
         EXISTS(SELECT 1 FROM recipe_favorites rf WHERE rf.recipe_id = r.id AND rf.user_id = $1) as is_favorite
         FROM recipes r
         LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
         LEFT JOIN ingredients i ON ri.ingredient_id = i.id
         LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
         WHERE (r.is_public = true OR r.created_by = $1)
           AND (r.name ILIKE $2 OR i.name ILIKE $2)
         GROUP BY r.id
         ORDER BY r.name`,
        [userId, `%${search}%`]
      );
    } else if (onlyUser === "true") {
      result = await query(
        `SELECT r.*, STRING_AGG(i.name, ', ') as ingredient_names,
         COALESCE(AVG(rr.rating), 0) as avg_rating,
         COUNT(DISTINCT rr.id) as rating_count,
         EXISTS(SELECT 1 FROM recipe_favorites rf WHERE rf.recipe_id = r.id AND rf.user_id = $1) as is_favorite
         FROM recipes r
         LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
         LEFT JOIN ingredients i ON ri.ingredient_id = i.id
         LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
         LEFT JOIN user_recipes ur ON r.id = ur.recipe_id AND ur.user_id = $1
         WHERE r.created_by = $1 OR ur.user_id = $1
         GROUP BY r.id
         ORDER BY r.name`,
        [userId]
      );
    } else {
      result = await query(
        `SELECT r.*, STRING_AGG(i.name, ', ') as ingredient_names,
         COALESCE(AVG(rr.rating), 0) as avg_rating,
         COUNT(DISTINCT rr.id) as rating_count,
         EXISTS(SELECT 1 FROM recipe_favorites rf WHERE rf.recipe_id = r.id AND rf.user_id = $1) as is_favorite
         FROM recipes r
         LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
         LEFT JOIN ingredients i ON ri.ingredient_id = i.id
         LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
         WHERE r.is_public = true OR r.created_by = $1
         GROUP BY r.id
         ORDER BY r.name`,
        [userId]
      );
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let client: PoolClient | undefined;
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json(UNAUTHENTICATED_RESPONSE, { status: 401 });
    const userId = authUser.id;
    const body = await request.json();
    const {
      name, description, instructions, prep_time, cook_time,
      servings, image_url, is_public, ingredients
    } = body;

    // Validation
    const errors = [
      ...validateRequired({ name }, ["name"]),
      ...validateMaxLength(name, "name", 200),
      ...validateMaxLength(description, "description", 2000),
      ...validateMaxLength(instructions, "instructions", 5000),
    ];

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    if ((servings != null && (!Number.isSafeInteger(servings) || servings < 1)) ||
        (ingredients != null && !Array.isArray(ingredients))) {
      return NextResponse.json({ error: "Nombre de portions ou ingrédients invalides." }, { status: 400 });
    }
    const seen = new Set<number>();
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        if (!ing || !Number.isSafeInteger(ing.ingredient_id) || seen.has(ing.ingredient_id) ||
            !Number.isFinite(ing.quantity) || ing.quantity <= 0) {
          return NextResponse.json({ error: "Chaque ingrédient doit avoir une quantité positive et apparaître une seule fois." }, { status: 400 });
        }
        seen.add(ing.ingredient_id);
        const { rows } = await query("SELECT * FROM ingredients WHERE id = $1", [ing.ingredient_id]);
        const ingredient = rows[0];
        const grams = ingredient && gramsPerUnit(ingredient, ing.unit || "g");
        if (!grams) return NextResponse.json({ error: "Ingrédient ou conversion inconnue. Indique le poids en grammes." }, { status: 400 });
        const factor = ing.quantity * grams / 100;
        totalCalories += ingredient.calories * factor;
        totalProtein += ingredient.protein * factor;
        totalCarbs += ingredient.carbs * factor;
        totalFat += ingredient.fat * factor;
      }
    }

    client = await (await getPool()).connect();
    await client.query("BEGIN");
    const { rows: recipeRows } = await client.query(
      `INSERT INTO recipes (name, description, instructions, prep_time, cook_time, servings, calories, protein, carbs, fat, image_url, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        name, description || null, instructions || null,
        prep_time ?? null, cook_time ?? null, servings || 1,
        Math.round(totalCalories), Math.round(totalProtein * 10) / 10,
        Math.round(totalCarbs * 10) / 10, Math.round(totalFat * 10) / 10,
        image_url || null, is_public ? true : false, userId
      ]
    );
    const recipeId = recipeRows[0].id;

    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)`,
          [recipeId, ing.ingredient_id, ing.quantity, ing.unit || "g"]
        );
      }
    }

    await client.query(
      `INSERT INTO user_recipes (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, recipeId]
    );

    const { rows } = await client.query("SELECT * FROM recipes WHERE id = $1", [recipeId]);
    await client.query("COMMIT");
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("POST /api/recipes error:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la recette" }, { status: 500 });
  } finally {
    client?.release();
  }
}
