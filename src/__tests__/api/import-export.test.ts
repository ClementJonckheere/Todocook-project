import { call, closeDb, createIngredient, createUser, describeDb, query, randomUUID } from "../support/api-harness";
import * as exportRoute from "@/app/api/export/route";
import * as importRoute from "@/app/api/import/route";

describeDb("export et import de recettes", () => {
  afterAll(closeDb);
  const recipeIngredients = async (userId: number, name: string) =>
    (await query(
      `SELECT i.name FROM recipes r JOIN recipe_ingredients ri ON ri.recipe_id = r.id JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE r.created_by = $1 AND r.name = $2 ORDER BY i.name`, [userId, name]
    )).rows.map((row: { name: string }) => row.name);

  it("export d'un compte réimporté par un autre : recettes et ingrédients recréés, sans doublon", async () => {
    const owner = await createUser("export");
    const other = await createUser("import");
    const ing = await createIngredient({ name: `Lentilles ${randomUUID().slice(0, 6)}` });
    const name = `Dahl ${randomUUID().slice(0, 6)}`;
    const { rows } = await query("INSERT INTO recipes (name, servings, calories, protein, carbs, fat, is_public, created_by) VALUES ($1, 2, 700, 30, 90, 15, false, $2) RETURNING id", [name, owner.id]);
    await query("INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, 200, 'g')", [rows[0].id, ing.id]);

    const exported = (await call(exportRoute.GET, "/x", { token: owner.token })).body;
    const first = await call(importRoute.POST, "/x", { method: "POST", token: other.token, body: exported });
    expect(first.body).toMatchObject({ imported: 1, completed: 0, skipped: 0, unmatched_ingredients: [] });
    expect(await recipeIngredients(other.id, name)).toEqual([ing.name]);
    expect((await call(importRoute.POST, "/x", { method: "POST", token: other.token, body: exported })).body).toMatchObject({ imported: 0, skipped: 1 });
  });

  it("ingrédient inconnu signalé, puis recette complétée au réimport une fois l'ingrédient ajouté", async () => {
    const user = await createUser("completion");
    const known = await createIngredient(), missing = `Comté ${randomUUID().slice(0, 6)}`;
    const file = { recipes: [{ name: `Tartine ${randomUUID().slice(0, 6)}`, ingredients: [{ name: known.name, quantity: 80 }, { name: missing, quantity: 40 }] }] };
    expect((await call(importRoute.POST, "/x", { method: "POST", token: user.token, body: file })).body.unmatched_ingredients).toEqual([missing]);
    await createIngredient({ name: missing });
    expect((await call(importRoute.POST, "/x", { method: "POST", token: user.token, body: file })).body).toMatchObject({ completed: 1, unmatched_ingredients: [] });
    expect(await recipeIngredients(user.id, file.recipes[0].name)).toEqual([known.name, missing].sort());
  });

  it("tout ou rien : une recette invalide n'importe rien ; JSON illisible et fichier trop gros refusés", async () => {
    const user = await createUser("invalide");
    const name = `Valide ${randomUUID().slice(0, 6)}`;
    const res = await call(importRoute.POST, "/x", { method: "POST", token: user.token, body: { recipes: [{ name }, { name: "", servings: 0 }] } });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(["recipes.1.name", "recipes.1.servings"]);
    expect((await query("SELECT count(*)::int AS n FROM recipes WHERE name = $1", [name])).rows[0].n).toBe(0);
    expect((await call(importRoute.POST, "/x", { method: "POST", token: user.token, body: "{oops" })).status).toBe(400);
    // Plus de 2 Mo (limite de l'import), via une section ignorée de l'export
    const big = { recipes: [{ name: "R" }], pantry: "x".repeat(2 * 1024 * 1024 + 1) };
    expect((await call(importRoute.POST, "/x", { method: "POST", token: user.token, body: big })).status).toBe(413);
  });

  it("un « % » dans un nom d'ingrédient ne correspond pas à n'importe quel ingrédient", async () => {
    const user = await createUser("joker");
    const res = await call(importRoute.POST, "/x", { method: "POST", token: user.token, body: { recipes: [{ name: `Joker ${randomUUID().slice(0, 6)}`, ingredients: [{ name: "%" }] }] } });
    expect(res.body.unmatched_ingredients).toEqual(["%"]);
  });
});
