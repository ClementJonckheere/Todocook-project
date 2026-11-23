import { Pool, types, type QueryResultRow } from "pg";
import { migrate } from "./migrate";

// Les colonnes DATE sont renvoyées telles quelles ("YYYY-MM-DD") et non converties en objet Date JS,
// ce qui évite les décalages de fuseau horaire côté front.
types.setTypeParser(types.builtins.DATE, (value: string) => value);

const DEFAULT_DEV_URL = "postgresql://todocook:todocook@localhost:5432/todocook";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL doit être défini en production.");
  }
  return DEFAULT_DEV_URL;
}

const pool = new Pool({ connectionString: databaseUrl() });

let ready: Promise<void> | null = null;

/**
 * Applique les migrations en attente au premier accès à la base.
 * Désactivable avec DB_AUTO_MIGRATE=false (on lance alors `npm run db:migrate` au déploiement).
 */
function ensureReady(): Promise<void> {
  if (process.env.DB_AUTO_MIGRATE === "false") return Promise.resolve();
  if (!ready) {
    ready = migrate(pool)
      .then((applied) => {
        if (applied.length) console.info(`Migrations appliquées : ${applied.join(", ")}`);
      })
      .catch((error) => {
        ready = null; // nouvelle tentative au prochain appel
        throw error;
      });
  }
  return ready;
}

export async function getPool() {
  await ensureReady();
  return pool;
}

export async function query<R extends QueryResultRow = any>(text: string, params?: unknown[]) {
  await ensureReady();
  return pool.query<R>(text, params);
}
