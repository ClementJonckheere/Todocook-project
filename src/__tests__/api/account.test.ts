import { call, closeDb, createRecipe, createUser, describeDb, query, randomUUID } from "../support/api-harness";
import { setMailSenderForTests, type Mail } from "@/lib/mailer";
import { SESSION_COOKIE, createSession } from "@/lib/auth";
import { DELETE as deleteAccount } from "@/app/api/account/route";
import { PUT as changeEmail } from "@/app/api/account/email/route";
import { PUT as changePassword } from "@/app/api/account/password/route";
import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";
import * as favorites from "@/app/api/favorites/route";
import * as mealPlans from "@/app/api/meal-plans/route";

const ip = () => ({ "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
const loginAs = (email: string, password: string) =>
  call(login, "/api/auth/login", { method: "POST", headers: { ...ip(), "x-client": "mobile" }, body: { email, password } });

describeDb("gestion du compte", () => {
  const sent: Mail[] = [];
  beforeAll(() => setMailSenderForTests(async (mail) => { sent.push(mail); }));
  afterAll(async () => {
    setMailSenderForTests(null);
    await closeDb();
  });

  describe("changement de mot de passe", () => {
    it("exige le mot de passe actuel, puis déconnecte les autres appareils", async () => {
      const user = await createUser("mdp");
      const otherDevice = await createSession(user.id, "mobile");

      const wrong = await call(changePassword, "/x", { method: "PUT", token: user.token, body: { current_password: "faux", new_password: "nouveau-mdp-1" } });
      expect(wrong.status).toBe(400);
      expect(wrong.body.errors[0].field).toBe("current_password");
      const weak = await call(changePassword, "/x", { method: "PUT", token: user.token, body: { current_password: user.password, new_password: "court" } });
      expect(weak.body.errors[0].field).toBe("new_password");

      const ok = await call(changePassword, "/x", { method: "PUT", token: user.token, body: { current_password: user.password, new_password: "nouveau-mdp-1" } });
      expect(ok.status).toBe(200);
      expect((await call(me, "/x", { token: user.token })).status).toBe(200); // cet appareil reste connecté
      expect((await call(me, "/x", { token: otherDevice })).status).toBe(401); // les autres non
      expect((await loginAs(user.email, user.password)).status).toBe(401);
      expect((await loginAs(user.email, "nouveau-mdp-1")).status).toBe(200);
    });
  });

  describe("changement d'adresse e-mail", () => {
    it("exige le mot de passe et refuse une adresse déjà utilisée", async () => {
      const user = await createUser("email"), other = await createUser("autre");
      const newEmail = `Nouvelle.${randomUUID().slice(0, 6)}@Test.local`;
      expect((await call(changeEmail, "/x", { method: "PUT", token: user.token, body: { email: newEmail, password: "faux" } })).status).toBe(400);
      expect((await call(changeEmail, "/x", { method: "PUT", token: user.token, body: { email: other.email, password: user.password } })).status).toBe(409);
      const ok = await call(changeEmail, "/x", { method: "PUT", token: user.token, body: { email: newEmail, password: user.password } });
      expect(ok.body.email).toBe(newEmail.toLowerCase());
      expect((await loginAs(newEmail, user.password)).status).toBe(200);
    });
  });

  describe("mot de passe oublié", () => {
    it("même réponse que le compte existe ou non ; e-mail envoyé seulement s'il existe", async () => {
      const user = await createUser("oubli");
      sent.length = 0;
      const unknown = await call(forgot, "/x", { method: "POST", headers: ip(), body: { email: `inconnu.${randomUUID().slice(0, 6)}@test.local` } });
      const known = await call(forgot, "/x", { method: "POST", headers: ip(), body: { email: user.email.toUpperCase() } });
      expect(unknown.status).toBe(200);
      expect(known.body).toEqual(unknown.body);
      expect(sent.map((mail) => mail.to)).toEqual([user.email]);
      expect(sent[0].text).toMatch(/\/reinitialiser-mot-de-passe\?token=/);
    });

    it("le lien permet de choisir un nouveau mot de passe, une seule fois, et déconnecte tout", async () => {
      const user = await createUser("reinit");
      sent.length = 0;
      await call(forgot, "/x", { method: "POST", headers: ip(), body: { email: user.email } });
      const token = new URL(sent[0].text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

      expect((await call(reset, "/x", { method: "POST", headers: ip(), body: { token, password: "court" } })).status).toBe(400);
      const ok = await call(reset, "/x", { method: "POST", headers: ip(), body: { token, password: "reinitialise-1" } });
      expect(ok.status).toBe(200);
      expect((await call(me, "/x", { token: user.token })).status).toBe(401); // sessions révoquées
      expect((await loginAs(user.email, "reinitialise-1")).status).toBe(200);
      // Lien déjà utilisé
      const again = await call(reset, "/x", { method: "POST", headers: ip(), body: { token, password: "encore-un-autre" } });
      expect(again.status).toBe(400);
      expect(again.body.error).toMatch(/invalide ou expiré/);
    });

    it("un lien expiré, inconnu, ou remplacé par une nouvelle demande est refusé", async () => {
      const user = await createUser("expire");
      sent.length = 0;
      await call(forgot, "/x", { method: "POST", headers: ip(), body: { email: user.email } });
      await call(forgot, "/x", { method: "POST", headers: ip(), body: { email: user.email } });
      const [first, second] = sent.map((mail) => new URL(mail.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!);
      expect((await call(reset, "/x", { method: "POST", headers: ip(), body: { token: first, password: "nouveau-mdp-2" } })).status).toBe(400);
      await query("UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1", [user.id]);
      expect((await call(reset, "/x", { method: "POST", headers: ip(), body: { token: second, password: "nouveau-mdp-2" } })).status).toBe(400);
      expect((await call(reset, "/x", { method: "POST", headers: ip(), body: { token: "a".repeat(43), password: "nouveau-mdp-2" } })).status).toBe(400);
    });
  });

  describe("suppression du compte", () => {
    it("exige le mot de passe et la confirmation SUPPRIMER", async () => {
      const user = await createUser("prudent");
      expect((await call(deleteAccount, "/x", { method: "DELETE", token: user.token, body: { password: user.password, confirmation: "oui" } })).status).toBe(400);
      expect((await call(deleteAccount, "/x", { method: "DELETE", token: user.token, body: { password: "faux", confirmation: "SUPPRIMER" } })).status).toBe(400);
      expect((await call(me, "/x", { token: user.token })).status).toBe(200);
    });

    it("supprime toutes les données ; une recette publique utilisée par d'autres est conservée, anonymisée", async () => {
      const user = await createUser("partant"), other = await createUser("restant");
      const privee = await createRecipe(user, { isPublic: false });
      const publiqueUtilisee = await createRecipe(user, { isPublic: true });
      const publiqueInutilisee = await createRecipe(user, { isPublic: true });
      await call(mealPlans.POST, "/x", { method: "POST", token: user.token, body: { recipe_id: privee.id, date: "2026-05-01" } });
      await call(favorites.POST, "/x", { method: "POST", token: other.token, body: { recipe_id: publiqueUtilisee.id } });
      const plan = await call(mealPlans.POST, "/x", { method: "POST", token: other.token, body: { recipe_id: publiqueUtilisee.id, date: "2026-05-01" } });
      await query("INSERT INTO pantry_items (user_id, ingredient_id, quantity) SELECT $1, id, 1 FROM ingredients LIMIT 1", [user.id]);

      const res = await call(deleteAccount, "/x", { method: "DELETE", token: user.token, cookie: user.token, body: { password: user.password, confirmation: "SUPPRIMER" } });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ deleted_recipes: 2, anonymized_recipes: 1 });
      expect(res.setCookies.get(SESSION_COOKIE)).toBeNull();

      const left = (await query(
        `SELECT (SELECT count(*)::int FROM users WHERE id = $1) AS users,
                (SELECT count(*)::int FROM sessions WHERE user_id = $1) AS sessions,
                (SELECT count(*)::int FROM pantry_items WHERE user_id = $1) AS pantry,
                (SELECT count(*)::int FROM meal_plans WHERE user_id = $1) AS plans,
                (SELECT count(*)::int FROM recipes WHERE created_by = $1) AS recipes,
                (SELECT count(*)::int FROM recipes WHERE id = ANY($2)) AS deleted_recipes_left`,
        [user.id, [privee.id, publiqueInutilisee.id]]
      )).rows[0];
      expect(left).toEqual({ users: 0, sessions: 0, pantry: 0, plans: 0, recipes: 0, deleted_recipes_left: 0 });
      // L'historique de l'autre utilisateur est intact
      const kept = (await query("SELECT created_by, is_public FROM recipes WHERE id = $1", [publiqueUtilisee.id])).rows[0];
      expect(kept).toEqual({ created_by: null, is_public: true });
      expect((await query("SELECT count(*)::int AS n FROM meal_plans WHERE id = $1", [plan.body.id])).rows[0].n).toBe(1);
      expect((await call(me, "/x", { token: user.token })).status).toBe(401);
      expect((await loginAs(user.email, user.password)).status).toBe(401);
    });
  });
});
