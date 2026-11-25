/**
 * Test d'intégration des migrations : exécuté seulement si TEST_DATABASE_URL pointe vers une base
 * Postgres jetable (c'est le cas dans la CI). La base est entièrement vidée.
 */
import { Pool } from "pg";
import { listMigrationFiles, migrate } from "@/lib/migrate";

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describe("listMigrationFiles", () => {
  it("returns numbered SQL files in order", () => {
    const files = listMigrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect([...files].sort()).toEqual(files);
    files.forEach((file) => expect(file).toMatch(/^\d{3}_[\w-]+\.sql$/));
  });
});

describeDb("migrate (Postgres)", () => {
  const pool = new Pool({ connectionString: url });

  beforeAll(async () => {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  });
  afterAll(() => pool.end());

  it("applies every migration once, then nothing", async () => {
    expect(await migrate(pool)).toHaveLength(listMigrationFiles().length);
    expect(await migrate(pool)).toEqual([]);
  });

  it("stores dates as DATE and exposes consumed totals", async () => {
    const { rows } = await pool.query(
      `SELECT table_name, data_type FROM information_schema.columns
       WHERE column_name = 'date' AND table_name IN ('meal_plans', 'food_journal')`
    );
    expect(rows.map((row) => row.data_type)).toEqual(["date", "date"]);

    const user = await pool.query("INSERT INTO users(email, first_name, last_name) VALUES ('t@t.fr','T','T') RETURNING id");
    const ingredient = await pool.query("INSERT INTO ingredients(name, calories, protein, carbs, fat) VALUES ('Riz', 130, 2.7, 28, 0.3) RETURNING id");
    await pool.query(
      `INSERT INTO food_journal(user_id, entry_key, date, meal_type, ingredient_id, name, grams, calories_100g, protein_100g, carbs_100g, fat_100g)
       VALUES ($1, gen_random_uuid(), '2026-01-15', 'diner', $2, 'Riz', 200, 130, 2.7, 28, 0.3)`,
      [user.rows[0].id, ingredient.rows[0].id]
    );
    const totals = await pool.query("SELECT date::text, calories FROM consumed_daily_totals WHERE user_id = $1", [user.rows[0].id]);
    expect(totals.rows).toEqual([{ date: "2026-01-15", calories: 260 }]);
  });
});

describeDb("migration 005 (valeurs nutritionnelles des recettes de référence)", () => {
  const pool = new Pool({ connectionString: url });
  const migration005 = listMigrationFiles().find((file) => file.startsWith("005_"))!;
  afterAll(() => pool.end());

  it("convertit les recettes de référence en totaux et corrige les repas déjà consommés", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const { MIGRATIONS_DIR } = await import("@/lib/migrate");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query("INSERT INTO users(email, first_name, last_name) VALUES ('m5@t.fr','M','5') RETURNING id");
      const ref = await client.query(
        "INSERT INTO recipes(name, servings, calories, protein, carbs, fat) VALUES ('Gratin', 6, 320, 8, 35, 18) RETURNING id"
      );
      const solo = await client.query(
        "INSERT INTO recipes(name, servings, calories, protein, carbs, fat) VALUES ('Toast', 1, 350, 14, 28, 22) RETURNING id"
      );
      const mine = await client.query(
        "INSERT INTO recipes(name, servings, calories, protein, carbs, fat, created_by) VALUES ('Perso', 4, 1200, 40, 100, 50, $1) RETURNING id",
        [user.rows[0].id]
      );
      // Repas consommé avec la valeur erronée figée : 320 / 6
      await client.query(
        `INSERT INTO meal_plans(user_id, recipe_id, date, consumed_portions, nutrition_per_portion)
         VALUES ($1, $2, '2026-01-01', 1, jsonb_build_object('calories', 320.0 / 6, 'protein', 8.0 / 6, 'carbs', 35.0 / 6, 'fat', 18.0 / 6))`,
        [user.rows[0].id, ref.rows[0].id]
      );

      await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, migration005), "utf8"));

      const recipes = await client.query("SELECT name, calories, protein FROM recipes WHERE id = ANY($1) ORDER BY name", [
        [ref.rows[0].id, solo.rows[0].id, mine.rows[0].id],
      ]);
      expect(recipes.rows).toEqual([
        { name: "Gratin", calories: 1920, protein: 48 }, // 6 portions x 320 kcal
        { name: "Perso", calories: 1200, protein: 40 }, // recette d'utilisateur : inchangée
        { name: "Toast", calories: 350, protein: 14 }, // une seule portion : inchangée
      ]);
      const meal = await client.query("SELECT nutrition_per_portion->>'calories' AS kcal FROM meal_plans WHERE recipe_id = $1", [ref.rows[0].id]);
      expect(Number(meal.rows[0].kcal)).toBeCloseTo(320);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
