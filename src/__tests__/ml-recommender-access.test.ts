/**
 * Non-régression : les recommandations IA ne doivent jamais proposer les recettes privées
 * d'un autre utilisateur (fuite via l'ancien modèle partagé entre utilisateurs).
 * Test d'intégration : exécuté seulement si TEST_DATABASE_URL est défini (CI).
 */
import { Pool, type PoolClient } from "pg";
import { buildRecommenderForUser } from "@/lib/ml-recommender";

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb("buildRecommenderForUser", () => {
  const pool = new Pool({ connectionString: url });
  let client: PoolClient;
  let alice: number, bob: number, riz: number, oeuf: number;
  const recipe = async (name: string, isPublic: boolean, owner: number | null, ingredients: number[]) => {
    const { rows } = await client.query(
      "INSERT INTO recipes(name, servings, calories, protein, carbs, fat, is_public, created_by) VALUES ($1, 1, 400, 20, 50, 10, $2, $3) RETURNING id",
      [name, isPublic, owner]
    );
    for (const id of ingredients) {
      await client.query("INSERT INTO recipe_ingredients(recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, 100, 'g')", [rows[0].id, id]);
    }
    return rows[0].id as number;
  };
  const names = (recs: { recipe: { name: string } }[]) => recs.map((r) => r.recipe.name).sort();
  const goals = { calories: 2000, protein: 60, carbs: 250, fat: 70 };

  beforeAll(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
    const user = async (email: string) =>
      (await client.query("INSERT INTO users(email, first_name, last_name) VALUES ($1, 'T', 'T') RETURNING id", [email])).rows[0].id;
    alice = await user("alice.reco@test.local");
    bob = await user("bob.reco@test.local");
    const ing = async (name: string) =>
      (await client.query("INSERT INTO ingredients(name, unit, calories, protein, carbs, fat) VALUES ($1, 'g', 100, 5, 10, 2) RETURNING id", [name])).rows[0].id;
    riz = await ing("Riz reco");
    oeuf = await ing("Oeuf reco");
    await recipe("Publique reco", true, null, [riz, oeuf]);
    await recipe("Privée d'Alice", false, alice, [riz, oeuf]);
    await recipe("Privée de Bob", false, bob, [riz, oeuf]);
  });

  afterAll(async () => {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  });

  it("ne propose que les recettes publiques et celles de l'utilisateur, quel que soit l'ordre des appels", async () => {
    // Bob d'abord : avec l'ancien modèle partagé, c'est ce qui exposait ses recettes à Alice
    const forBob = await buildRecommenderForUser(client, bob);
    const forAlice = await buildRecommenderForUser(client, alice);
    const all = { maxMissing: 20, limit: 100 };

    const aliceNames = names(forAlice.recommend([riz, oeuf], null, goals, all)).filter((n) => n.includes("reco") || n.startsWith("Privée"));
    const bobNames = names(forBob.recommend([riz, oeuf], null, goals, all)).filter((n) => n.includes("reco") || n.startsWith("Privée"));
    expect(aliceNames).toEqual(["Privée d'Alice", "Publique reco"]);
    expect(bobNames).toEqual(["Privée de Bob", "Publique reco"]);
  });

  it("ne renvoie pas de recette privée d'un autre utilisateur parmi les recettes similaires", async () => {
    const forAlice = await buildRecommenderForUser(client, alice);
    const publicId = (await client.query("SELECT id FROM recipes WHERE name = 'Publique reco'")).rows[0].id;
    const similar = forAlice.findSimilarRecipes(publicId, 20).map((r) => r.name);
    expect(similar).toContain("Privée d'Alice");
    expect(similar).not.toContain("Privée de Bob");
  });
});
