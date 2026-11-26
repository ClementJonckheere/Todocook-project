import { call, closeDb, createUser, describeDb, query, type TestUser } from "../support/api-harness";
import * as scanner from "@/app/api/scanner/route";

describeDb("scanner (Open Food Facts simulé)", () => {
  let user: TestUser;
  const realFetch = global.fetch;
  const barcode = () => `3${String(Date.now()).slice(-11)}${Math.floor(Math.random() * 10)}`;
  beforeAll(async () => {
    user = await createUser("scanner");
    // Les pannes simulées d'Open Food Facts sont journalisées par la route : messages attendus
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => { global.fetch = realFetch; });
  afterAll(closeDb);

  const offReturns = (body: unknown, status = 200) => {
    const fake = jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    global.fetch = fake as unknown as typeof fetch;
    return fake;
  };

  it("refuse un code-barres qui n'est pas composé de 8 à 14 chiffres, sans appeler Open Food Facts", async () => {
    const fake = offReturns({});
    for (const code of ["abc def", "1234", "123456789012345"]) {
      expect((await call(scanner.GET, "/x", { token: user.token, query: { barcode: code } })).status).toBe(400);
    }
    expect(fake).not.toHaveBeenCalled();
  });

  it("produit trouvé : enregistré, kJ convertis, valeurs absentes laissées inconnues", async () => {
    const code = barcode();
    offReturns({ status: 1, product: { product_name: "Galettes", brands: "Test", nutriments: { "energy-kj_100g": 1600, proteins_100g: 8, carbohydrates_100g: 70 } } });
    const res = await call(scanner.GET, "/x", { token: user.token, query: { barcode: code } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: "openfoodfacts", nutrition_complete: false, product: { name: "Galettes", calories: 382.4, fat: null } });
    // Deuxième scan : servi depuis le catalogue local
    offReturns({});
    expect((await call(scanner.GET, "/x", { token: user.token, query: { barcode: code } })).body.source).toBe("local");
    await query("DELETE FROM ingredients WHERE barcode = $1", [code]);
  });

  it("produit inconnu : 404 ; Open Food Facts en panne : 503 (pas d'erreur 500)", async () => {
    offReturns({ status: 0 });
    expect((await call(scanner.GET, "/x", { token: user.token, query: { barcode: barcode() } })).status).toBe(404);
    global.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const down = await call(scanner.GET, "/x", { token: user.token, query: { barcode: barcode() } });
    expect(down.status).toBe(503);
    expect(down.body.error).toMatch(/injoignable/);
    offReturns({}, 502);
    expect((await call(scanner.GET, "/x", { token: user.token, query: { barcode: barcode() } })).status).toBe(503);
  });
});
