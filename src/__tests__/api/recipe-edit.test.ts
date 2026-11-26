import { call, closeDb, createIngredient, createRecipe, createUser, describeDb, query, type TestUser } from "../support/api-harness";
import * as favorites from "@/app/api/favorites/route";
import * as mealPlans from "@/app/api/meal-plans/route";
import * as recipeById from "@/app/api/recipes/[id]/route";
import * as recipes from "@/app/api/recipes/route";

describeDb("modification de recette", () => {
  let owner: TestUser, other: TestUser;
  let riz: { id: number }, oeuf: { id: number };
  beforeAll(async () => {
    owner = await createUser("auteur");
    other = await createUser("autre");
    riz = await createIngredient({ calories: 130, protein: 2.7, carbs: 28, fat: 0.3 });
    oeuf = await createIngredient({ calories: 155, protein: 13, carbs: 1.1, fat: 11 });
  });
  afterAll(closeDb);

  const create = async () =>
    (await call(recipes.POST, "/x", {
      method: "POST", token: owner.token,
      body: { name: "Riz nature", servings: 2, ingredients: [{ ingredient_id: riz.id, quantity: 200 }] },
    })).body as { id: number; calories: number };

  it("le créateur modifie sa recette : ingrédients remplacés et valeurs recalculées", async () => {
    const recipe = await create();
    expect(recipe.calories).toBe(260);
    const res = await call(recipeById.PUT, "/x", {
      method: "PUT", token: owner.token, params: { id: recipe.id },
      body: { name: "Riz aux œufs", servings: 3, prep_time: 5, cook_time: 15, instructions: "Cuire.",
        ingredients: [{ ingredient_id: riz.id, quantity: 300 }, { ingredient_id: oeuf.id, quantity: 100 }] },
    });
    expect(res.status).toBe(200);
    // 300 g de riz (390 kcal) + 100 g d'œuf (155 kcal)
    expect(res.body).toMatchObject({ name: "Riz aux œufs", servings: 3, calories: 545, protein: 21.1, is_public: false });

    const detail = (await call(recipeById.GET, "/x", { token: owner.token, params: { id: recipe.id } })).body;
    expect(detail.is_owner).toBe(true);
    expect(detail.ingredients.map((i: { ingredient_id: number; quantity: number }) => [i.ingredient_id, i.quantity]))
      .toEqual([[riz.id, 300], [oeuf.id, 100]]);
  });

  it("les repas déjà consommés gardent leurs valeurs, les repas prévus suivent la recette", async () => {
    const recipe = await create(); // 260 kcal pour 2 portions
    const eaten = (await call(mealPlans.POST, "/x", { method: "POST", token: owner.token, body: { recipe_id: recipe.id, date: "2026-04-01" } })).body;
    await call(mealPlans.PATCH, "/x", { method: "PATCH", token: owner.token, body: { id: eaten.id, portions: 1 } });
    await call(mealPlans.POST, "/x", { method: "POST", token: owner.token, body: { recipe_id: recipe.id, date: "2026-04-02" } });

    await call(recipeById.PUT, "/x", {
      method: "PUT", token: owner.token, params: { id: recipe.id },
      body: { name: "Riz nature", servings: 2, ingredients: [{ ingredient_id: riz.id, quantity: 400 }] },
    });
    const plans = (await call(mealPlans.GET, "/x", { token: owner.token, query: { startDate: "2026-04-01", endDate: "2026-04-02" } })).body;
    expect(plans.map((p: { date: string; calories: number }) => [p.date, p.calories])).toEqual([["2026-04-01", 130], ["2026-04-02", 260]]);
  });

  it("refuse la modification d'une recette d'un autre utilisateur ou du catalogue (404)", async () => {
    const recipe = await create();
    const body = { name: "Piratée", ingredients: [{ ingredient_id: riz.id, quantity: 1 }] };
    expect((await call(recipeById.PUT, "/x", { method: "PUT", token: other.token, params: { id: recipe.id }, body })).status).toBe(404);
    const catalogue = await createRecipe(null, { isPublic: true });
    expect((await call(recipeById.PUT, "/x", { method: "PUT", token: owner.token, params: { id: catalogue.id }, body })).status).toBe(404);
    const othersPublic = await createRecipe(other, { isPublic: true });
    expect((await call(recipeById.PUT, "/x", { method: "PUT", token: owner.token, params: { id: othersPublic.id }, body })).status).toBe(404);
    expect((await query("SELECT name FROM recipes WHERE id = $1", [recipe.id])).rows[0].name).toBe("Riz nature");
    expect((await call(recipeById.GET, "/x", { token: other.token, params: { id: othersPublic.id } })).body.is_owner).toBe(true);
    expect((await call(recipeById.GET, "/x", { token: owner.token, params: { id: othersPublic.id } })).body.is_owner).toBe(false);
  });

  it("valide la saisie et ne modifie rien en cas d'erreur", async () => {
    const recipe = await create();
    const put = (body: unknown) => call(recipeById.PUT, "/x", { method: "PUT", token: owner.token, params: { id: recipe.id }, body });
    expect((await put({ name: "", ingredients: [] })).status).toBe(400);
    expect((await put({ name: "X", ingredients: [{ ingredient_id: riz.id, quantity: 1 }, { ingredient_id: riz.id, quantity: 2 }] })).status).toBe(400);
    expect((await put({ name: "X", ingredients: [{ ingredient_id: 2147483000, quantity: 1 }] })).status).toBe(404);
    const unknown = await createIngredient({ calories: null, barcode: `31${Date.now()}`.slice(0, 13) });
    expect((await put({ name: "X", ingredients: [{ ingredient_id: unknown.id, quantity: 10 }] })).status).toBe(400);
    const after = (await call(recipeById.GET, "/x", { token: owner.token, params: { id: recipe.id } })).body;
    expect(after).toMatchObject({ name: "Riz nature", calories: 260 });
    expect(after.ingredients).toHaveLength(1);
  });

  it("une recette publique utilisée par d'autres ne peut pas redevenir privée", async () => {
    const pub = (await call(recipes.POST, "/x", {
      method: "POST", token: owner.token,
      body: { name: "Riz partagé", is_public: true, ingredients: [{ ingredient_id: riz.id, quantity: 100 }] },
    })).body;
    await call(favorites.POST, "/x", { method: "POST", token: other.token, body: { recipe_id: pub.id } });
    const body = { name: "Riz partagé", ingredients: [{ ingredient_id: riz.id, quantity: 100 }] };
    expect((await call(recipeById.PUT, "/x", { method: "PUT", token: owner.token, params: { id: pub.id }, body: { ...body, is_public: false } })).status).toBe(409);
    // Sans is_public, la visibilité est conservée
    expect((await call(recipeById.PUT, "/x", { method: "PUT", token: owner.token, params: { id: pub.id }, body })).body.is_public).toBe(true);
  });
});
