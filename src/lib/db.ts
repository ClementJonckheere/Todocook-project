import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://todocook:todocook@localhost:5432/todocook",
});

let initialized = false;

async function initializeDatabase() {
  if (initialized) return;

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        age INTEGER,
        weight DOUBLE PRECISION,
        height DOUBLE PRECISION,
        gender TEXT,
        activity_level TEXT,
        daily_calorie_goal INTEGER DEFAULT 2000,
        daily_protein_goal DOUBLE PRECISION DEFAULT 50,
        daily_carbs_goal DOUBLE PRECISION DEFAULT 250,
        daily_fat_goal DOUBLE PRECISION DEFAULT 70,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT UNIQUE,
        calories DOUBLE PRECISION DEFAULT 0,
        protein DOUBLE PRECISION DEFAULT 0,
        carbs DOUBLE PRECISION DEFAULT 0,
        fat DOUBLE PRECISION DEFAULT 0,
        fiber DOUBLE PRECISION DEFAULT 0,
        unit TEXT DEFAULT 'g',
        image_url TEXT,
        brand TEXT,
        category TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        instructions TEXT,
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER DEFAULT 1,
        calories DOUBLE PRECISION DEFAULT 0,
        protein DOUBLE PRECISION DEFAULT 0,
        carbs DOUBLE PRECISION DEFAULT 0,
        fat DOUBLE PRECISION DEFAULT 0,
        image_url TEXT,
        is_public BOOLEAN DEFAULT true,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        quantity DOUBLE PRECISION NOT NULL,
        unit TEXT DEFAULT 'g',
        UNIQUE(recipe_id, ingredient_id)
      );

      CREATE TABLE IF NOT EXISTS pantry_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
        quantity DOUBLE PRECISION DEFAULT 1,
        unit TEXT DEFAULT 'g',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, ingredient_id)
      );

      CREATE TABLE IF NOT EXISTS meal_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        meal_type TEXT DEFAULT 'dejeuner',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_recipes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        UNIQUE(user_id, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS daily_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        calories DOUBLE PRECISION DEFAULT 0,
        protein DOUBLE PRECISION DEFAULT 0,
        carbs DOUBLE PRECISION DEFAULT 0,
        fat DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS recipe_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS recipe_ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS shopping_lists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        checked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    initialized = true;
    // Seed database with initial data if empty (dynamic import to avoid circular dependency)
    const { seedDatabase } = await import("./seed");
    await seedDatabase();
  } finally {
    client.release();
  }
}

export async function getPool() {
  await initializeDatabase();
  return pool;
}

export async function query(text: string, params?: any[]) {
  await initializeDatabase();
  return pool.query(text, params);
}
