import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://todocook:todocook@localhost:5432/todocook",
});

let initialized = false;

async function initializeDatabase() {
  if (initialized) return;

  const client = await pool.connect();
  try {
    // Check if tables already exist to avoid recreation errors
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);

    if (rows[0].exists) {
      // Run migrations for existing databases
      await runMigrations(client);
      initialized = true;
      return;
    }

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
        sport_type TEXT DEFAULT 'aucun',
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
    await runMigrations(client);
    initialized = true;
    // Seed database with initial data if empty (dynamic import to avoid circular dependency)
    const { seedDatabase } = await import("./seed");
    await seedDatabase();
  } finally {
    client.release();
  }
}

// Run migrations for existing databases
async function runMigrations(client: any) {
  // Add sport_type column if it doesn't exist
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'sport_type'
      ) THEN
        ALTER TABLE users ADD COLUMN sport_type TEXT DEFAULT 'aucun';
      END IF;
    END $$;
  `);

  // Add indexes for frequently queried columns
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id ON shopping_list_items(list_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
    CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS dinner_exclusions (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, ingredient_id)
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS nutrition_goal TEXT NOT NULL DEFAULT 'maintien'
      CHECK (nutrition_goal IN ('maintien', 'prise_masse', 'perte_poids'));
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS planned_portions DOUBLE PRECISION NOT NULL DEFAULT 1
      CHECK (planned_portions > 0 AND planned_portions <= 100);
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS consumed_portions DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (consumed_portions >= 0);
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS nutrition_per_portion JSONB;
    CREATE TABLE IF NOT EXISTS food_journal (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entry_key UUID NOT NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      brand TEXT,
      grams DOUBLE PRECISION NOT NULL CHECK (grams > 0 AND grams <= 10000),
      calories_100g DOUBLE PRECISION NOT NULL,
      protein_100g DOUBLE PRECISION NOT NULL,
      carbs_100g DOUBLE PRECISION NOT NULL,
      fat_100g DOUBLE PRECISION NOT NULL,
      UNIQUE (user_id, entry_key)
    );
    CREATE INDEX IF NOT EXISTS idx_food_journal_user_date ON food_journal (user_id, date);
    CREATE OR REPLACE VIEW consumed_daily_totals AS
      SELECT user_id, date, SUM(calories) AS calories, SUM(protein) AS protein,
        SUM(carbs) AS carbs, SUM(fat) AS fat
      FROM (
        SELECT user_id, date, consumed_portions * (nutrition_per_portion->>'calories')::float8 AS calories,
          consumed_portions * (nutrition_per_portion->>'protein')::float8 AS protein,
          consumed_portions * (nutrition_per_portion->>'carbs')::float8 AS carbs,
          consumed_portions * (nutrition_per_portion->>'fat')::float8 AS fat
        FROM meal_plans WHERE consumed_portions > 0
        UNION ALL
        SELECT user_id, date, calories_100g * grams / 100, protein_100g * grams / 100,
          carbs_100g * grams / 100, fat_100g * grams / 100 FROM food_journal
      ) consumed GROUP BY user_id, date;
  `);
}

export async function getPool() {
  await initializeDatabase();
  return pool;
}

export async function query(text: string, params?: any[]) {
  await initializeDatabase();
  return pool.query(text, params);
}
