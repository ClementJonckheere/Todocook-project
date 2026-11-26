/**
 * Isolation des données entre utilisateurs : Alice ne doit jamais voir ni modifier
 * les données privées de Bob, quelle que soit la route.
 */
import {
  call, closeDb, createIngredient, createRecipe, createUser, describeDb, query, randomUUID, type TestUser,
} from "../support/api-harness";
import * as dailyLogs from "@/app/api/daily-logs/route";
import * as exportRoute from "@/app/api/export/route";
import * as favorites from "@/app/api/favorites/route";
import * as foodJournal from "@/app/api/food-journal/route";
import * as mealPlans from "@/app/api/meal-plans/route";
import * as pantry from "@/app/api/pantry/route";
import * as pantryMissing from "@/app/api/pantry/missing/route";
import * as ratings from "@/app/api/ratings/route";
import * as recipeById from "@/app/api/recipes/[id]/route";
import * as mlRecommendations from "@/app/api/recipes/ml-recommendations/route";
import * as recommendations from "@/app/api/recipes/recommendations/route";
import * as recipes from "@/app/api/recipes/route";
import * as shoppingList from "@/app/api/shopping-list/route";
import * as listCheckAll from "@/app/api/shopping-lists/[id]/check-all/route";
import * as listDuplicate from "@/app/api/shopping-lists/[id]/duplicate/route";
import * as listItem from "@/app/api/shopping-lists/[id]/items/[itemId]/route";
import * as listItems from "@/app/api/shopping-lists/[id]/items/route";
import * as listById from "@/app/api/shopping-lists/[id]/route";
import * as listUncheckAll from "@/app/api/shopping-lists/[id]/uncheck-all/route";
import * as lists from "@/app/api/shopping-lists/route";
import * as suggestions from "@/app/api/suggestions/route";
import * as dinnerExclusions from "@/app/api/users/dinner-exclusions/route";
import * as users from "@/app/api/users/route";

const TODAY = new Date().toISOString().slice(0, 10);

describeDb("isolation des données entre utilisateurs", () => {
  let alice: TestUser, bob: TestUser;
  let secret: { id: number; name: string };
  let publicRecipe: { id: number; name: string };
  let bobList: number, bobItem: number, bobPantryItem: number, bobMealPlan: number, bobJournalEntry: number;
  let ingredientIds: number[];

  beforeAll(async () => {
    alice = await createUser("alice");
    bob = await createUser("bob");
    const a = await createIngredient(), b = await createIngredient();
    ingredientIds = [a.id, b.id];
    publicRecipe = await createRecipe(null, { ingredients: [{ id: a.id }, { id: b.id }] });
    secret = await createRecipe(bob, { name: `Secret de Bob ${randomUUID().slice(0, 6)}`, ingredients: [{ id: a.id }, { id: b.id }] });
    // Les deux ont les ingrédients en stock : la recette secrète serait un candidat idéal pour Alice
    for (const user of [alice, bob]) {
      for (const id of ingredientIds) await query("INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, 1000, 'g')", [user.id, id]);
    }
    bobPantryItem = (await query("SELECT id FROM pantry_items WHERE user_id = $1 LIMIT 1", [bob.id])).rows[0].id;
    bobList = (await call(lists.POST, "/api/shopping-lists", { method: "POST", token: bob.token, body: { title: "Courses de Bob" } })).body.id;
    bobItem = (await call(listItems.POST, "/x", { method: "POST", token: bob.token, params: { id: bobList }, body: { name: "Lait" } })).body.id;
    bobMealPlan = (await call(mealPlans.POST, "/api/meal-plans", { method: "POST", token: bob.token, body: { recipe_id: secret.id, date: TODAY } })).body.id;
    bobJournalEntry = (await call(foodJournal.POST, "/api/food-journal", {
      method: "POST", token: bob.token, body: { date: TODAY, meal_type: "diner", grams: 100, ingredient_id: a.id, entry_key: randomUUID() },
    })).body.id;
    await call(dinnerExclusions.PUT, "/x", { method: "PUT", token: bob.token, body: { id: b.id, excluded: true } });
  });

  afterAll(closeDb);

  const asAlice = (handler: unknown, options: Parameters<typeof call>[2] = {}) => call(handler as never, "/x", { token: alice.token, ...options });
  const names = (list: { name: string }[]) => list.map((r) => r.name);

  describe("recettes privées", () => {
    it("ne sont ni lisibles, ni notables, ni mises en favori, ni planifiables, ni supprimables", async () => {
      expect((await asAlice(recipeById.GET, { params: { id: secret.id } })).status).toBe(404);
      expect((await asAlice(ratings.POST, { method: "POST", body: { recipe_id: secret.id, rating: 5 } })).status).toBe(404);
      expect((await asAlice(favorites.POST, { method: "POST", body: { recipe_id: secret.id } })).status).toBe(404);
      expect((await asAlice(mealPlans.POST, { method: "POST", body: { recipe_id: secret.id, date: TODAY } })).status).toBe(404);
      expect((await asAlice(recipeById.DELETE, { method: "DELETE", params: { id: secret.id } })).status).toBe(404);
      expect((await asAlice(mlRecommendations.POST, { method: "POST", body: { recipeId: secret.id } })).status).toBe(404);
      // La recette existe toujours pour Bob
      expect((await call(recipeById.GET, "/x", { token: bob.token, params: { id: secret.id } })).status).toBe(200);
    });

    it("n'apparaissent dans aucune liste, recherche, suggestion ou recommandation", async () => {
      const checks: [string, string[]][] = [
        ["liste des recettes", names((await asAlice(recipes.GET)).body)],
        ["recherche", names((await asAlice(recipes.GET, { query: { search: "Secret de Bob" } })).body)],
        ["suggestions", names((await asAlice(suggestions.GET, { query: { maxMissing: "all" } })).body.recipes)],
        ["suggestions dîner", names((await asAlice(suggestions.GET, { query: { maxMissing: "all", personalize: "dinner" } })).body.recipes)],
        ["recommandations", names((await asAlice(recommendations.GET, { query: { maxMissing: 20, limit: 100 } })).body.recipes)],
        ["recommandations IA", names((await asAlice(mlRecommendations.GET, { query: { maxMissing: 20, limit: 100 } })).body.recipes)],
        ["recettes similaires", names((await asAlice(mlRecommendations.POST, { method: "POST", body: { recipeId: publicRecipe.id, limit: 20 } })).body.similarRecipes)],
      ];
      for (const [label, list] of checks) {
        expect({ label, leaked: list.includes(secret.name) }).toEqual({ label, leaked: false });
      }
      // …alors qu'elles apparaissent bien pour Bob
      expect(names((await call(mlRecommendations.GET, "/x", { token: bob.token, query: { maxMissing: 20, limit: 100 } })).body.recipes)).toContain(secret.name);
      expect(names((await call(suggestions.GET, "/x", { token: bob.token, query: { maxMissing: "all" } })).body.recipes)).toContain(secret.name);
    });
  });

  describe("listes de courses", () => {
    it("celles de Bob sont introuvables et non modifiables pour Alice", async () => {
      const p = { params: { id: bobList } };
      expect((await asAlice(lists.GET)).body.some((l: { id: number }) => l.id === bobList)).toBe(false);
      expect((await asAlice(listById.GET, p)).status).toBe(404);
      expect((await asAlice(listById.PUT, { ...p, method: "PUT", body: { title: "Piratée" } })).status).toBe(404);
      expect((await asAlice(listItems.POST, { ...p, method: "POST", body: { name: "Intrus" } })).status).toBe(404);
      expect((await asAlice(listItem.PUT, { method: "PUT", params: { id: bobList, itemId: bobItem }, body: { checked: true } })).status).toBe(404);
      expect((await asAlice(listItem.DELETE, { method: "DELETE", params: { id: bobList, itemId: bobItem } })).status).toBe(404);
      expect((await asAlice(listCheckAll.POST, { ...p, method: "POST" })).status).toBe(404);
      expect((await asAlice(listUncheckAll.POST, { ...p, method: "POST" })).status).toBe(404);
      expect((await asAlice(listDuplicate.POST, { ...p, method: "POST" })).status).toBe(404);
      expect((await asAlice(listById.DELETE, { ...p, method: "DELETE" })).status).toBe(404);

      const intact = await call(listById.GET, "/x", { token: bob.token, ...p });
      expect(intact.body.title).toBe("Courses de Bob");
      expect(intact.body.items.map((i: { name: string; checked: boolean }) => [i.name, i.checked])).toEqual([["Lait", false]]);
    });
  });

  describe("garde-manger, planning, journal et préférences", () => {
    it("Alice ne peut ni supprimer ni modifier les données de Bob", async () => {
      expect((await asAlice(pantry.DELETE, { method: "DELETE", query: { id: bobPantryItem } })).status).toBe(404);
      expect((await asAlice(mealPlans.PATCH, { method: "PATCH", body: { id: bobMealPlan, portions: 3 } })).status).toBe(404);
      expect((await asAlice(mealPlans.DELETE, { method: "DELETE", query: { id: bobMealPlan } })).status).toBe(404);
      expect((await asAlice(foodJournal.PATCH, { method: "PATCH", body: { id: bobJournalEntry, grams: 999, meal_type: "collation" } })).status).toBe(404);
      await asAlice(foodJournal.DELETE, { method: "DELETE", query: { id: bobJournalEntry } });

      const { rows } = await query(
        `SELECT (SELECT count(*)::int FROM pantry_items WHERE id = $1) AS pantry,
                (SELECT consumed_portions FROM meal_plans WHERE id = $2) AS consumed,
                (SELECT grams FROM food_journal WHERE id = $3) AS grams`,
        [bobPantryItem, bobMealPlan, bobJournalEntry]
      );
      expect(rows[0]).toEqual({ pantry: 1, consumed: 0, grams: 100 });
    });

    it("chaque lecture ne renvoie que les données de l'utilisateur", async () => {
      const ownedBy = async (table: string, ids: number[]) =>
        (await query(`SELECT count(*)::int AS n FROM ${table} WHERE id = ANY($1) AND user_id <> $2`, [ids, alice.id])).rows[0].n;
      const pantryRows = (await asAlice(pantry.GET)).body;
      expect(await ownedBy("pantry_items", pantryRows.map((r: { id: number }) => r.id))).toBe(0);
      expect((await asAlice(mealPlans.GET)).body.some((m: { id: number }) => m.id === bobMealPlan)).toBe(false);
      expect((await asAlice(foodJournal.GET, { query: { date: TODAY } })).body.some((e: { id: number }) => e.id === bobJournalEntry)).toBe(false);
      expect((await asAlice(dailyLogs.GET, { query: { date: TODAY } })).body).toEqual([]);
      expect((await asAlice(pantryMissing.GET)).body.some((r: { recipe_name: string }) => r.recipe_name === secret.name)).toBe(false);
      expect((await asAlice(shoppingList.GET, { query: { startDate: TODAY, endDate: TODAY } })).body).toEqual([]);
      const exclusions = (await asAlice(dinnerExclusions.GET)).body.filter((f: { excluded: boolean }) => f.excluded);
      expect(exclusions).toEqual([]);
      const profile = (await asAlice(users.GET)).body;
      expect(profile.email).toBe(alice.email);
      expect(profile.password_hash).toBeUndefined();
    });

    it("l'export ne contient que les données d'Alice", async () => {
      const data = (await asAlice(exportRoute.GET)).body;
      expect(names(data.recipes)).not.toContain(secret.name);
      expect(data.meal_plans.some((m: { recipe_name: string }) => m.recipe_name === secret.name)).toBe(false);
      expect(data.food_journal).toEqual([]);
      expect(JSON.stringify(data)).not.toContain(bob.email);
    });
  });
});
