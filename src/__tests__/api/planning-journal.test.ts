import { call, closeDb, createIngredient, createRecipe, createUser, describeDb, query, randomUUID, type TestUser } from "../support/api-harness";
import * as dailyLogs from "@/app/api/daily-logs/route";
import * as foodJournal from "@/app/api/food-journal/route";
import * as mealPlans from "@/app/api/meal-plans/route";
import * as recipes from "@/app/api/recipes/route";
import * as shoppingList from "@/app/api/shopping-list/route";

const DAY = "2026-03-10";

describeDb("planning, journal et totaux du jour", () => {
  let user: TestUser;
  afterAll(closeDb);
  beforeAll(async () => {
    user = await createUser("planning");
  });

  it("une recette créée a ses valeurs calculées depuis ses ingrédients", async () => {
    const riz = await createIngredient({ calories: 130, protein: 2.7, carbs: 28, fat: 0.3 });
    const res = await call(recipes.POST, "/api/recipes", {
      method: "POST", token: user.token,
      body: { name: `Riz ${randomUUID().slice(0, 4)}`, servings: 2, ingredients: [{ ingredient_id: riz.id, quantity: 300 }] },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ calories: 390, protein: 8.1, carbs: 84, fat: 0.9, servings: 2, is_public: false });
  });

  it("repas planifié puis consommé : les totaux du jour suivent les portions et les valeurs figées", async () => {
    const recipe = await createRecipe(user, { servings: 4 }); // 800 kcal pour 4 portions
    const plan = await call(mealPlans.POST, "/api/meal-plans", { method: "POST", token: user.token, body: { recipe_id: recipe.id, date: DAY, planned_portions: "1,5" } });
    expect(plan.status).toBe(201);
    expect(plan.body).toMatchObject({ planned_portions: 1.5, calories: 200 });

    expect((await call(dailyLogs.GET, "/x", { token: user.token, query: { date: DAY } })).body).toEqual([]);
    expect((await call(mealPlans.PATCH, "/x", { method: "PATCH", token: user.token, body: { id: plan.body.id, portions: 1.5 } })).status).toBe(200);
    // La recette change ensuite : le repas déjà mangé garde ses valeurs
    await query("UPDATE recipes SET calories = 4000 WHERE id = $1", [recipe.id]);
    const totals = (await call(dailyLogs.GET, "/x", { token: user.token, query: { date: DAY } })).body[0];
    expect(totals.calories).toBe(300);

    // Un repas consommé ne peut plus être supprimé ; annuler la consommation le permet
    expect((await call(mealPlans.DELETE, "/x", { method: "DELETE", token: user.token, query: { id: plan.body.id } })).status).toBe(404);
    await call(mealPlans.PATCH, "/x", { method: "PATCH", token: user.token, body: { id: plan.body.id, portions: 0 } });
    expect((await call(mealPlans.DELETE, "/x", { method: "DELETE", token: user.token, query: { id: plan.body.id } })).status).toBe(200);
  });

  it("journal : ajout idempotent, modification, suppression et totaux", async () => {
    const pain = await createIngredient({ calories: 265, protein: 9, carbs: 49, fat: 3.2 });
    const entry = { date: DAY, meal_type: "petit-dejeuner", grams: 60, ingredient_id: pain.id, entry_key: randomUUID() };
    const first = await call(foodJournal.POST, "/x", { method: "POST", token: user.token, body: entry });
    const retry = await call(foodJournal.POST, "/x", { method: "POST", token: user.token, body: entry });
    expect(first.status).toBe(201);
    expect(retry.status).toBe(200); // même entry_key : pas de doublon
    expect(retry.body.id).toBe(first.body.id);
    expect((await call(foodJournal.GET, "/x", { token: user.token, query: { date: DAY } })).body).toHaveLength(1);

    await call(foodJournal.PATCH, "/x", { method: "PATCH", token: user.token, body: { id: first.body.id, grams: 100, meal_type: "collation" } });
    expect((await call(dailyLogs.GET, "/x", { token: user.token, query: { date: DAY } })).body[0].calories).toBe(265);

    await call(foodJournal.DELETE, "/x", { method: "DELETE", token: user.token, query: { id: first.body.id } });
    expect((await call(foodJournal.GET, "/x", { token: user.token, query: { date: DAY } })).body).toEqual([]);
  });

  it("journal : refuse un produit aux valeurs nutritionnelles inconnues, et les saisies invalides", async () => {
    const incomplete = await createIngredient({ calories: null, barcode: `30${Date.now()}`.slice(0, 13) });
    const res = await call(foodJournal.POST, "/x", {
      method: "POST", token: user.token,
      body: { date: DAY, meal_type: "collation", grams: 30, ingredient_id: incomplete.id, entry_key: randomUUID() },
    });
    expect(res.status).toBe(422);
    for (const body of [
      { date: "2026-02-30", meal_type: "diner", grams: 10, ingredient_id: incomplete.id, entry_key: randomUUID() },
      { date: DAY, meal_type: "brunch", grams: 10, ingredient_id: incomplete.id, entry_key: randomUUID() },
      { date: DAY, meal_type: "diner", grams: 0, ingredient_id: incomplete.id, entry_key: randomUUID() },
      { date: DAY, meal_type: "diner", grams: 10, ingredient_id: incomplete.id, entry_key: "pas-un-uuid" },
    ]) {
      expect((await call(foodJournal.POST, "/x", { method: "POST", token: user.token, body })).status).toBe(400);
    }
  });

  it("liste de courses : quantités selon les portions prévues, moins le garde-manger", async () => {
    const farine = await createIngredient();
    const recipe = await createRecipe(user, { servings: 2, ingredients: [{ id: farine.id, quantity: 400 }] });
    await call(mealPlans.POST, "/x", { method: "POST", token: user.token, body: { recipe_id: recipe.id, date: "2026-03-20", planned_portions: 3 } });
    await query("INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, 250, 'g')", [user.id, farine.id]);
    const list = (await call(shoppingList.GET, "/x", { token: user.token, query: { startDate: "2026-03-20", endDate: "2026-03-20" } })).body;
    // 400 g pour 2 portions × 3 portions prévues = 600 g ; 250 g en stock → 350 g à acheter
    expect(list.find((item: { id: number }) => item.id === farine.id)).toMatchObject({ total_needed: 600, in_pantry: 250, to_buy: 350 });
  });
});
