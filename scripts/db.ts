/**
 * Outils base de données en ligne de commande.
 *   npm run db:migrate             applique les migrations en attente
 *   npm run db:seed                insère les ingrédients et recettes de référence (base vide)
 *   npm run db:seed -- --demo      ajoute aussi un compte de démo (SEED_DEMO_EMAIL / SEED_DEMO_PASSWORD)
 */
import { getPool } from "../src/lib/db";
import { seedDemoUser, seedReferenceData } from "../src/lib/seed";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const pool = await getPool(); // applique les migrations en attente

  if (command === "migrate") {
    console.log("Base à jour.");
  } else if (command === "seed") {
    console.log((await seedReferenceData()) ? "Données de référence insérées." : "Recettes déjà présentes : rien à faire.");
    if (args.includes("--demo")) {
      const email = process.env.SEED_DEMO_EMAIL || "demo@todocook.local";
      const password = process.env.SEED_DEMO_PASSWORD;
      if (!password || password.length < 8) {
        throw new Error("Définissez SEED_DEMO_PASSWORD (8 caractères minimum) pour créer le compte de démo.");
      }
      console.log((await seedDemoUser(email, password)) ? `Compte de démo créé : ${email}` : `Le compte ${email} existe déjà.`);
    }
  } else {
    throw new Error(`Commande inconnue : ${command ?? "(aucune)"}. Utilisez "migrate" ou "seed".`);
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
