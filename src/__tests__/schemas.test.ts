import { parseJsonBody, parseWith } from "@/lib/api-validation";
import { escapeLike } from "@/lib/sql";
import {
  importSchema,
  isoDate,
  mealPlanCreateSchema,
  profileUpdateSchema,
  ratingSchema,
  recipeCreateSchema,
  registerSchema,
  IMPORT_MAX_RECIPES,
} from "@/lib/schemas";

const ok = <T>(result: { data?: T; response?: unknown }) => {
  expect(result.response).toBeUndefined();
  return result.data as T;
};

const errorsOf = async (result: { response?: Response }) => {
  expect(result.response).toBeDefined();
  return (await result.response!.json()) as { error: string; errors: { field: string; message: string }[] };
};

describe("registerSchema", () => {
  const base = { email: "  Alice@Example.FR ", password: "motdepasse", first_name: " Alice ", last_name: "Martin" };

  it("normalises the email, trims names and converts numbers sent as text", () => {
    const data = ok(parseWith(registerSchema, { ...base, age: "34", weight: "62,5", height: "" }));
    expect(data).toMatchObject({ email: "alice@example.fr", first_name: "Alice", age: 34, weight: 62.5 });
    expect(data.height).toBeUndefined();
  });

  it("rejects short passwords, bad emails and out-of-range values with French messages", async () => {
    const body = await errorsOf(parseWith(registerSchema, { ...base, email: "pas-un-email", password: "court", age: 5 }));
    const fields = body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(["email", "password", "age"]));
    expect(body.errors.find((e) => e.field === "password")?.message).toBe("Le mot de passe doit contenir au moins 8 caractères");
    expect(body.error).toBe(body.errors[0].message);
  });

  it("rejects unknown enum values", async () => {
    const body = await errorsOf(parseWith(registerSchema, { ...base, gender: "autre" }));
    expect(body.errors[0].field).toBe("gender");
  });
});

describe("profileUpdateSchema", () => {
  it("ignores unknown fields and treats null as not provided", () => {
    const data = ok(parseWith(profileUpdateSchema, { id: 1, email: "x@y.fr", created_at: "…", age: null, weight: 70 }));
    expect(data).toEqual({ weight: 70 });
  });
});

describe("recipeCreateSchema", () => {
  it("defaults to no ingredient and refuses duplicates", async () => {
    expect(ok(parseWith(recipeCreateSchema, { name: "Soupe" })).ingredients).toEqual([]);
    const body = await errorsOf(
      parseWith(recipeCreateSchema, {
        name: "Soupe",
        ingredients: [
          { ingredient_id: 1, quantity: 10 },
          { ingredient_id: 1, quantity: 20 },
        ],
      })
    );
    expect(body.error).toBe("Chaque ingrédient doit apparaître une seule fois.");
  });

  it("requires positive quantities and an https image", async () => {
    const body = await errorsOf(
      parseWith(recipeCreateSchema, { name: "Soupe", image_url: "http://x", ingredients: [{ ingredient_id: 1, quantity: 0 }] })
    );
    expect(body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(["image_url", "ingredients.0.quantity"]));
  });
});

describe("importSchema", () => {
  const recipe = { name: "Gratin", servings: 6, calories: 1920, ingredients: [{ name: "Pomme de terre", quantity: 1000, unit: "g" }] };

  it("accepts a TodoCook export and ignores its other sections", () => {
    const data = ok(parseWith(importSchema, { recipes: [recipe], pantry: [{ name: "Riz" }], exported_at: "…" }));
    expect(data).toEqual({ recipes: [expect.objectContaining({ name: "Gratin", servings: 6 })] });
  });

  it("drops the empty ingredient entry produced for a recipe without ingredients", () => {
    const data = ok(parseWith(importSchema, { recipes: [{ ...recipe, ingredients: [{ name: null, quantity: null }] }] }));
    expect(data.recipes[0].ingredients).toEqual([]);
  });

  it("rejects a file without recipes, invalid recipes and oversized imports", async () => {
    const missing = await errorsOf(parseWith(importSchema, { foo: 1 }));
    expect(missing.errors[0].field).toBe("recipes");
    expect(missing.error).toMatch(/export TodoCook/);
    expect((await errorsOf(parseWith(importSchema, { recipes: [{ name: "" }] }))).errors[0].field).toBe("recipes.0.name");
    const tooMany = Array.from({ length: IMPORT_MAX_RECIPES + 1 }, (_, i) => ({ name: `R${i}` }));
    expect((await errorsOf(parseWith(importSchema, { recipes: tooMany }))).error).toBe(`${IMPORT_MAX_RECIPES} recettes maximum par import`);
  });
});

describe("other schemas", () => {
  it("validates real calendar dates", () => {
    expect(isoDate.safeParse("2026-02-28").success).toBe(true);
    expect(isoDate.safeParse("2026-02-30").success).toBe(false);
    expect(isoDate.safeParse("28/02/2026").success).toBe(false);
  });

  it("defaults meal plans to one lunch portion", () => {
    expect(ok(parseWith(mealPlanCreateSchema, { recipe_id: "3", date: "2026-11-25" }))).toEqual({
      recipe_id: 3, date: "2026-11-25", meal_type: "dejeuner", planned_portions: 1,
    });
  });

  it("only accepts whole ratings from 1 to 5", () => {
    expect(ratingSchema.safeParse({ recipe_id: 1, rating: 4.5 }).success).toBe(false);
    expect(ratingSchema.safeParse({ recipe_id: 1, rating: 5, comment: "" }).success).toBe(true);
  });
});

describe("parseJsonBody", () => {
  const post = (body: string) => new Request("http://x", { method: "POST", body });

  it("returns 400 on invalid JSON and 413 on oversized bodies", async () => {
    const invalid = await parseJsonBody(post("{oops"), ratingSchema);
    expect(invalid.response?.status).toBe(400);
    const big = await parseJsonBody(post(JSON.stringify({ comment: "x".repeat(200) })), ratingSchema, 100);
    expect(big.response?.status).toBe(413);
  });
});

describe("escapeLike", () => {
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});
