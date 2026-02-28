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

      -- MUSCULATION TABLES --

      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        muscle_group TEXT NOT NULL,
        secondary_muscles TEXT[],
        difficulty TEXT DEFAULT 'intermediate',
        instructions TEXT,
        video_url TEXT,
        image_url TEXT,
        rest_time_light INTEGER DEFAULT 60,
        rest_time_moderate INTEGER DEFAULT 90,
        rest_time_heavy INTEGER DEFAULT 120,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exercise_equipment (
        id SERIAL PRIMARY KEY,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
        is_required BOOLEAN DEFAULT true,
        UNIQUE(exercise_id, equipment_id)
      );

      CREATE TABLE IF NOT EXISTS user_routines (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        days_of_week INTEGER[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS routine_exercises (
        id SERIAL PRIMARY KEY,
        routine_id INTEGER NOT NULL REFERENCES user_routines(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        position INTEGER DEFAULT 0,
        sets INTEGER DEFAULT 3,
        reps INTEGER DEFAULT 10,
        weight DOUBLE PRECISION DEFAULT 0,
        rest_time INTEGER DEFAULT 90,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workout_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        routine_id INTEGER REFERENCES user_routines(id) ON DELETE SET NULL,
        date TEXT NOT NULL,
        duration_minutes INTEGER,
        notes TEXT,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workout_exercise_logs (
        id SERIAL PRIMARY KEY,
        workout_log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        reps INTEGER,
        weight DOUBLE PRECISION,
        completed BOOLEAN DEFAULT false,
        rest_time_taken INTEGER,
        notes TEXT,
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

  // Create musculation tables if they don't exist
  await client.query(`
    CREATE TABLE IF NOT EXISTS equipment (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      muscle_group TEXT NOT NULL,
      secondary_muscles TEXT[],
      difficulty TEXT DEFAULT 'intermediate',
      instructions TEXT,
      video_url TEXT,
      image_url TEXT,
      rest_time_light INTEGER DEFAULT 60,
      rest_time_moderate INTEGER DEFAULT 90,
      rest_time_heavy INTEGER DEFAULT 120,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exercise_equipment (
      id SERIAL PRIMARY KEY,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
      is_required BOOLEAN DEFAULT true,
      UNIQUE(exercise_id, equipment_id)
    );

    CREATE TABLE IF NOT EXISTS user_routines (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      days_of_week INTEGER[],
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id SERIAL PRIMARY KEY,
      routine_id INTEGER NOT NULL REFERENCES user_routines(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      position INTEGER DEFAULT 0,
      sets INTEGER DEFAULT 3,
      reps INTEGER DEFAULT 10,
      weight DOUBLE PRECISION DEFAULT 0,
      rest_time INTEGER DEFAULT 90,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      routine_id INTEGER REFERENCES user_routines(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      duration_minutes INTEGER,
      notes TEXT,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workout_exercise_logs (
      id SERIAL PRIMARY KEY,
      workout_log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight DOUBLE PRECISION,
      completed BOOLEAN DEFAULT false,
      rest_time_taken INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
    CREATE INDEX IF NOT EXISTS idx_user_routines_user_id ON user_routines(user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(user_id, date);
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
