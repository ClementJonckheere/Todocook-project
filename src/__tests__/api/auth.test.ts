import { call, closeDb, createUser, describeDb, query, randomUUID } from "../support/api-harness";
import { SESSION_COOKIE } from "@/lib/auth";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as register } from "@/app/api/auth/register/route";
import * as account from "@/app/api/account/route";
import * as accountEmail from "@/app/api/account/email/route";
import * as accountPassword from "@/app/api/account/password/route";
import * as dailyLogs from "@/app/api/daily-logs/route";
import * as exportRoute from "@/app/api/export/route";
import * as favorites from "@/app/api/favorites/route";
import * as foodJournal from "@/app/api/food-journal/route";
import * as importRoute from "@/app/api/import/route";
import * as ingredients from "@/app/api/ingredients/route";
import * as mealPlans from "@/app/api/meal-plans/route";
import * as pantryMissing from "@/app/api/pantry/missing/route";
import * as pantry from "@/app/api/pantry/route";
import * as ratings from "@/app/api/ratings/route";
import * as recipeById from "@/app/api/recipes/[id]/route";
import * as mlRecommendations from "@/app/api/recipes/ml-recommendations/route";
import * as recommendations from "@/app/api/recipes/recommendations/route";
import * as recipes from "@/app/api/recipes/route";
import * as scanner from "@/app/api/scanner/route";
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

// Toutes les routes qui exigent une session, avec chacune de leurs méthodes
const protectedRoutes: [string, Record<string, unknown>, Record<string, string>?][] = [
  ["account", account], ["account/email", accountEmail], ["account/password", accountPassword],
  ["daily-logs", dailyLogs], ["export", exportRoute], ["favorites", favorites], ["food-journal", foodJournal],
  ["import", importRoute], ["ingredients", ingredients], ["meal-plans", mealPlans], ["pantry/missing", pantryMissing],
  ["pantry", pantry], ["ratings", ratings], ["recipes/[id]", recipeById, { id: "1" }],
  ["recipes/ml-recommendations", mlRecommendations], ["recipes/recommendations", recommendations], ["recipes", recipes],
  ["scanner", scanner], ["shopping-list", shoppingList], ["shopping-lists/[id]/check-all", listCheckAll, { id: "1" }],
  ["shopping-lists/[id]/duplicate", listDuplicate, { id: "1" }], ["shopping-lists/[id]/items/[itemId]", listItem, { id: "1", itemId: "1" }],
  ["shopping-lists/[id]/items", listItems, { id: "1" }], ["shopping-lists/[id]", listById, { id: "1" }],
  ["shopping-lists/[id]/uncheck-all", listUncheckAll, { id: "1" }], ["shopping-lists", lists], ["suggestions", suggestions],
  ["users/dinner-exclusions", dinnerExclusions], ["users", users],
];
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const cases = protectedRoutes.flatMap(([path, module, params]) =>
  METHODS.filter((method) => typeof module[method] === "function").map((method) => [`${method} /api/${path}`, module[method], params] as const)
);

const ip = () => ({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });

describeDb("authentification des routes API", () => {
  afterAll(closeDb);

  it.each(cases)("%s refuse l'accès sans session", async (_name, handler, params) => {
    const body = { recipe_id: 1, id: 1, title: "x", name: "x", checked: true, rating: 5 };
    for (const credentials of [{}, { token: "jeton-inconnu-0123456789abcdefghij" }]) {
      const res = await call(handler as never, "/api/x", { method: _name.split(" ")[0], body: _name.startsWith("GET") ? undefined : body, params, ...credentials });
      expect(res.status).toBe(401);
    }
  });

  it("inscription : valide les champs, puis ouvre une session (cookie web, token mobile)", async () => {
    const email = `inscription.${randomUUID().slice(0, 8)}@test.local`;
    const invalid = await call(register, "/api/auth/register", { method: "POST", headers: ip(), body: { email: "pas-un-email", password: "court", first_name: "", last_name: "T" } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.errors.map((e: { field: string }) => e.field)).toEqual(expect.arrayContaining(["email", "password", "first_name"]));

    const web = await call(register, "/api/auth/register", {
      method: "POST", headers: ip(),
      body: { email: email.toUpperCase(), password: "motdepasse1", first_name: "Iris", last_name: "T", age: "28", weight: "60", height: "168", gender: "femme", activity_level: "leger" },
    });
    expect(web.status).toBe(201);
    expect(web.body.email).toBe(email);
    expect(web.body.token).toBeUndefined(); // le web reçoit un cookie httpOnly, pas le token
    expect(web.setCookies.get(SESSION_COOKIE)).toBeTruthy();
    expect(web.body.daily_calorie_goal).toBeGreaterThan(1200);

    const duplicate = await call(register, "/api/auth/register", { method: "POST", headers: ip(), body: { email, password: "motdepasse1", first_name: "A", last_name: "B" } });
    expect(duplicate.status).toBe(409);
  });

  it("connexion : mauvais mot de passe refusé, token pour le mobile, cookie pour le web", async () => {
    const user = await createUser("connexion");
    expect((await call(login, "/api/auth/login", { method: "POST", headers: ip(), body: { email: user.email, password: "faux-mot-de-passe" } })).status).toBe(401);

    const mobile = await call(login, "/api/auth/login", { method: "POST", headers: { ...ip(), "x-client": "mobile" }, body: { email: user.email.toUpperCase(), password: user.password } });
    expect(mobile.status).toBe(200);
    expect(typeof mobile.body.token).toBe("string");
    expect((await call(me, "/api/auth/me", { token: mobile.body.token })).body.email).toBe(user.email);

    const web = await call(login, "/api/auth/login", { method: "POST", headers: ip(), body: { email: user.email, password: user.password } });
    const cookie = web.setCookies.get(SESSION_COOKIE)!;
    expect((await call(me, "/api/auth/me", { cookie })).status).toBe(200);
  });

  it("déconnexion : la session est révoquée côté serveur", async () => {
    const user = await createUser("deconnexion");
    expect((await call(me, "/api/auth/me", { token: user.token })).status).toBe(200);
    expect((await call(logout, "/api/auth/logout", { method: "POST", token: user.token })).status).toBe(200);
    expect((await call(me, "/api/auth/me", { token: user.token })).status).toBe(401);
  });

  it("session expirée : 401 et cookie effacé", async () => {
    const user = await createUser("expiree");
    await query("UPDATE sessions SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1", [user.id]);
    const res = await call(me, "/api/auth/me", { cookie: user.token });
    expect(res.status).toBe(401);
    expect(res.setCookies.get(SESSION_COOKIE)).toBeNull();
  });

  it("limite les tentatives de connexion (429 au 11e échec)", async () => {
    const headers = ip();
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await call(login, "/api/auth/login", { method: "POST", headers, body: { email: `inconnu${i}@test.local`, password: "x" } })).status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
