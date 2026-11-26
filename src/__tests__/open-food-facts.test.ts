import { caloriesPer100g, hasNutrition, lookupOffProduct, parseOffProduct } from "@/lib/open-food-facts";
import { barcodeQuerySchema } from "@/lib/schemas";

describe("caloriesPer100g", () => {
  it("prefers kcal, otherwise converts kJ", () => {
    expect(caloriesPer100g({ "energy-kcal_100g": 389, "energy-kj_100g": 1628 })).toBe(389);
    expect(caloriesPer100g({ "energy-kj_100g": 1628 })).toBe(389.1);
    expect(caloriesPer100g({ energy_100g: "418,4" })).toBe(100);
  });

  it("returns null (unknown) instead of 0 when energy is missing or absurd", () => {
    expect(caloriesPer100g({})).toBeNull();
    expect(caloriesPer100g({ "energy-kcal_100g": -5 })).toBeNull();
    expect(caloriesPer100g({ "energy-kcal_100g": 5000 })).toBeNull();
    expect(caloriesPer100g({ "energy-kcal_100g": 0 })).toBe(0); // eau, sel… : 0 réel
  });
});

describe("parseOffProduct", () => {
  it("keeps missing nutrients unknown and cleans text fields", () => {
    const product = parseOffProduct({
      product_name: "  Céréales  ",
      brands: "Marque",
      categories_tags: ["fr:petit-dejeuners"],
      image_url: "http://insecure.example/img.jpg",
      nutriments: { "energy-kj_100g": 1600, proteins_100g: 8, carbohydrates_100g: "70" },
    });
    expect(product).toEqual({
      name: "Céréales", brand: "Marque", category: "petit-dejeuners", image_url: null,
      calories: 382.4, protein: 8, carbs: 70, fat: null, fiber: null,
    });
    expect(hasNutrition(product)).toBe(false);
  });
});

describe("lookupOffProduct", () => {
  const fake = (impl: () => Promise<Response>) => (() => impl()) as unknown as typeof fetch;
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  it("distinguishes found, not found and unavailable", async () => {
    const found = await lookupOffProduct("3017620422003", fake(() => json({ status: 1, product: { product_name: "Pâte", nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 } } })));
    expect(found.status).toBe("found");
    expect((await lookupOffProduct("1", fake(() => json({ status: 0 })))).status).toBe("not_found");
    expect((await lookupOffProduct("1", fake(() => json({}, 404))))).toEqual({ status: "not_found" });
    expect((await lookupOffProduct("1", fake(() => json({}, 502))))).toEqual({ status: "unavailable", reason: "réponse 502" });
    expect((await lookupOffProduct("1", fake(() => Promise.reject(new TypeError("fetch failed")))))).toEqual({ status: "unavailable", reason: "service injoignable" });
  });

  it("gives up after the timeout", async () => {
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)))) as unknown as typeof fetch;
    expect(await lookupOffProduct("1", hanging, 50)).toEqual({ status: "unavailable", reason: "délai dépassé" });
  });
});

describe("barcodeQuerySchema", () => {
  it("accepts 8 to 14 digits only", () => {
    expect(barcodeQuerySchema.safeParse({ barcode: " 3017620422003 " }).success).toBe(true);
    for (const barcode of ["abc def", "1234567", "123456789012345", "30176204220a3"]) {
      expect(barcodeQuerySchema.safeParse({ barcode }).success).toBe(false);
    }
  });
});
