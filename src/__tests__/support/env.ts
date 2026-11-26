// Les tests de routes utilisent la base de test : db.ts lit DATABASE_URL au chargement.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
