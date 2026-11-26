# TodoCook

Assistant cuisine et nutrition : garde-manger, scanner de codes-barres (Open Food Facts),
suggestions de recettes, planning des repas avec portions, journal alimentaire,
objectifs nutritionnels personnalisés et listes de courses.

- **Web / PWA** : Next.js 16 (App Router, React 19) + routes API dans `src/app/api` ; Node.js 20.9 minimum
- **Base de données** : PostgreSQL 16 (driver `pg`, SQL écrit à la main, sans ORM)
- **Mobile** : Expo SDK 54 / React Native dans `mobile/`, qui consomme la même API

## Démarrage rapide

```bash
cp .env.example .env.local
npm install
npm run db:up                      # Postgres via docker compose
npm run db:migrate                 # crée / met à jour le schéma
npm run db:seed                    # ingrédients et recettes de référence
npm run dev                        # http://localhost:3000
```

Pour avoir un compte prêt à l'emploi, avec un garde-manger et un planning de démonstration :

```bash
SEED_DEMO_PASSWORD=un-mot-de-passe npm run db:seed -- --demo   # demo@todocook.local
```

### Application mobile

```bash
cd mobile
npm install
npx expo start
```

En développement, l'application appelle l'API sur la machine qui lance Expo (port 3000).
Pour une autre adresse, définissez `EXPO_PUBLIC_API_URL` (voir `mobile/.env.example`).
La connexion se fait avec un compte existant ; l'inscription passe par le site web.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint 10 (`eslint-config-next/core-web-vitals`, configuration dans `eslint.config.mjs`) |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests Jest. Les tests d'intégration (routes API, migrations) ne tournent que si `TEST_DATABASE_URL` est défini (**cette base est entièrement vidée**) |
| `npm run db:migrate` | Applique les migrations en attente |
| `npm run db:seed [-- --demo]` | Données de référence (et compte de démo) |

## Base de données

Le schéma est versionné dans `migrations/NNN_description.sql`. Chaque fichier est appliqué
une seule fois, dans une transaction, et enregistré dans la table `schema_migrations`.
Par défaut, les migrations en attente s'appliquent aussi au premier accès à la base
(`DB_AUTO_MIGRATE=false` pour désactiver ce comportement en production). `npm run db:migrate` et
`npm run db:seed` appliquent toujours les migrations, quel que soit ce réglage.

**Ajouter une migration** : créer `migrations/004_ma_modification.sql` (numéro suivant) et ne
jamais modifier une migration déjà appliquée.

Tables et vues utiles pour l'analyse (Qlik, SQL…) :

- `consumed_daily_totals` (vue) : calories et macros réellement consommées par utilisateur et par jour
  (repas planifiés marqués comme mangés + journal alimentaire)
- `meal_plans` : planning des repas, portions prévues et consommées, valeurs nutritionnelles figées au moment de la consommation
- `food_journal` : aliments consignés hors recettes (grammes + valeurs pour 100 g)
- `legacy_daily_logs` : ancienne saisie manuelle des totaux, conservée en lecture seule

Toutes les colonnes `date` sont de type `DATE`.

## Authentification

- Sessions opaques stockées en base (`sessions`, seule l'empreinte SHA-256 du token est conservée),
  valables 7 jours et révoquées à la déconnexion.
- Web : cookie `httpOnly`. Mobile : en-tête `Authorization: Bearer <token>`, le token étant
  enregistré dans le trousseau sécurisé de l'appareil (`expo-secure-store`).
- Toutes les routes API exigent une session, sauf `auth/login`, `auth/register`, `auth/logout`
  et `nutrition/calculate`.
- Connexion limitée à 10 tentatives / 15 min (par IP et par email), inscription à 5 / heure par IP.
  Ce compteur est en mémoire : avec plusieurs instances, il faudra le déplacer dans Redis ou Postgres.

## Tests

```bash
TEST_DATABASE_URL=postgresql://todocook:todocook@localhost:5432/todocook_test npm test
```

- `src/__tests__/*.test.ts` : bibliothèques (nutrition, schémas, sessions…) et migrations.
- `src/__tests__/api/*.test.ts` : routes API appelées directement avec de vraies requêtes, contre
  Postgres (harnais : `src/__tests__/support/api-harness.ts` ; seul `next/headers` est simulé).
  Ils couvrent l'authentification de chaque route protégée, l'isolation des données entre
  utilisateurs (recettes privées, listes, planning, journal, export, recommandations), le
  planning et le journal, l'import/export, le scanner (Open Food Facts simulé) et le proxy.
- Les tests s'exécutent en série : ils partagent la même base.

## Validation des requêtes

Chaque route API valide son corps, ses paramètres d'URL et sa query string avec [zod](https://zod.dev),
via `parseJsonBody`, `parseQuery` et `parseWith` (`src/lib/api-validation.ts`). Les schémas sont
regroupés dans `src/lib/schemas.ts`. En cas d'erreur, la réponse est un `400` (ou `413` si le corps
dépasse la taille autorisée) au format `{ "error": "premier message", "errors": [{ "field", "message" }] }`.

## Export et import

`GET /api/export` produit un fichier JSON de toutes les données de l'utilisateur ; `POST /api/import`
n'en réimporte que les recettes (2 Mo et 200 recettes maximum, en une seule transaction). Les ingrédients
sont rattachés au catalogue par nom exact ; ceux qui n'y figurent pas sont listés dans la réponse. Une
recette déjà possédée sous le même nom n'est pas recréée : réimporter le fichier après avoir ajouté les
ingrédients manquants au catalogue la complète (si tous ses ingrédients actuels figurent dans le fichier).

## Valeurs nutritionnelles des recettes

Les calories et macros d'une recette sont celles de la recette entière, calculées à partir de ses
ingrédients (`computeRecipeNutrition`, `src/lib/recipe-nutrition.ts`) : création de recette, données de
référence (`db:seed`) et migration 006 utilisent le même calcul. L'application divise par le nombre de
portions pour l'affichage, le planning et le journal.

## Structure

```
migrations/          schéma SQL versionné
scripts/db.ts        CLI migrate / seed
src/app/             pages Next.js et routes API
src/lib/             accès base, auth, nutrition, portions, recommandations…
src/__tests__/       tests Jest
mobile/              application Expo
```
