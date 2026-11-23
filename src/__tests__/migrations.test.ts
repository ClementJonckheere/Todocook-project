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
