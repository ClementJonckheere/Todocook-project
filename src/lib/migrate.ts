import fs from "fs";
import path from "path";
import type { Pool } from "pg";

// Dossier lu à l'exécution : l'indication évite que Turbopack analyse tout le projet au build.
export const MIGRATIONS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "migrations");

// Identifiant arbitraire du verrou consultatif : empêche deux instances de migrer en même temps.
const MIGRATION_LOCK_ID = 74_210_001;

export function listMigrationFiles(dir = MIGRATIONS_DIR): string[] {
  return fs
    .readdirSync(dir)
    .filter((file) => /^\d{3}_[\w-]+\.sql$/.test(file))
    .sort();
}

/**
 * Applique, dans l'ordre, les fichiers migrations/NNN_nom.sql pas encore appliqués.
 * Chaque fichier s'exécute dans sa propre transaction et est enregistré dans schema_migrations.
 * Retourne la liste des migrations appliquées lors de cet appel.
 */
export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const { rows } = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
    const done = new Set(rows.map((row) => row.version));

    for (const file of listMigrationFiles(dir)) {
      const version = file.replace(/\.sql$/, "");
      if (done.has(version)) continue;
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [version]);
        await client.query("COMMIT");
        applied.push(version);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Échec de la migration ${file} : ${(error as Error).message}`);
      }
    }
    return applied;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }
}
