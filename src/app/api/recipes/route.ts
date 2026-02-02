import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export async function GET(request: NextRequest) {
  const db = getDb();
  seedDatabase();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const userId = searchParams.get("userId");
  const onlyUser = searchParams.get("onlyUser");

  let recipes;
  if (search) {
    recipes = db.prepare(`
      SELECT r.*, GROUP_CONCAT(i.name, ', ') as ingredient_names
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE (r.is_public = 1 OR r.created_by = ?)
        AND (r.name LIKE ? OR i.name LIKE ?)
      GROUP BY r.id
      ORDER BY r.name
    `).all(userId || 1, `%${search}%`, `%${search}%`);
  } else if (onlyUser === "true" && userId) {
    recipes = db.prepare(`
      SELECT r.*, GROUP_CONCAT(i.name, ', ') as ingredient_names
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      LEFT JOIN user_recipes ur ON r.id = ur.recipe_id AND ur.user_id = ?
      WHERE r.created_by = ? OR ur.user_id = ?
      GROUP BY r.id
      ORDER BY r.name
    `).all(userId, userId, userId);
  } else {
    recipes = db.prepare(`
      SELECT r.*, GROUP_CONCAT(i.name, ', ') as ingredient_names
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE r.is_public = 1 OR r.created_by = ?
      GROUP BY r.id
      ORDER BY r.name
    `).all(userId || 1);
  }

  return NextResponse.json(recipes);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const {
    name, description, instructions, prep_time, cook_time,
    servings, image_url, is_public, created_by, ingredients
  } = body;

  // Calculate total nutrition from ingredients
  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
  if (ingredients && ingredients.length > 0) {
    for (const ing of ingredients) {
      const ingredient = db.prepare("SELECT * FROM ingredients WHERE id = ?").get(ing.ingredient_id) as any;
      if (ingredient) {
        const factor = ing.quantity / 100;
        totalCalories += ingredient.calories * factor;
        totalProtein += ingredient.protein * factor;
        totalCarbs += ingredient.carbs * factor;
        totalFat += ingredient.fat * factor;
      }
    }
  }

  const result = db.prepare(`
    INSERT INTO recipes (name, description, instructions, prep_time, cook_time, servings, calories, protein, carbs, fat, image_url, is_public, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, description || null, instructions || null,
    prep_time || null, cook_time || null, servings || 1,
    Math.round(totalCalories), Math.round(totalProtein * 10) / 10,
    Math.round(totalCarbs * 10) / 10, Math.round(totalFat * 10) / 10,
    image_url || null, is_public ? 1 : 0, created_by || 1
  );

  const recipeId = result.lastInsertRowid;

  // Insert recipe ingredients
  if (ingredients && ingredients.length > 0) {
    const stmt = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      VALUES (?, ?, ?, ?)
    `);
    for (const ing of ingredients) {
      stmt.run(recipeId, ing.ingredient_id, ing.quantity, ing.unit || "g");
    }
  }

  // Add to user's recipes
  if (created_by) {
    db.prepare(`
      INSERT OR IGNORE INTO user_recipes (user_id, recipe_id)
      VALUES (?, ?)
    `).run(created_by, recipeId);
  }

  const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(recipeId);
  return NextResponse.json(recipe, { status: 201 });
}
