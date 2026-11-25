-- 005 : les recettes de référence (seed) stockaient leurs calories et macros PAR PORTION,
-- alors que l'application considère recipes.calories/protein/carbs/fat comme les valeurs
-- de la RECETTE ENTIÈRE (c'est ce que calcule la création de recette, puis l'app divise
-- par servings). Les recettes de référence de plusieurs portions étaient donc sous-estimées
-- (ex. gratin dauphinois, 6 portions : 53 kcal affichées par portion au lieu de 320).
--
-- Recettes de référence = created_by IS NULL (les recettes des utilisateurs ne sont pas touchées).
-- Les nouvelles bases reçoivent directement des totaux via `npm run db:seed`.

-- 1. Valeurs nutritionnelles figées des repas déjà consommés : elles avaient été calculées
--    comme recipe.calories / servings, donc divisées à tort par le nombre de portions.
UPDATE meal_plans mp
SET nutrition_per_portion = jsonb_build_object(
  'calories', (mp.nutrition_per_portion->>'calories')::float8 * r.servings,
  'protein',  (mp.nutrition_per_portion->>'protein')::float8  * r.servings,
  'carbs',    (mp.nutrition_per_portion->>'carbs')::float8    * r.servings,
  'fat',      (mp.nutrition_per_portion->>'fat')::float8      * r.servings
)
FROM recipes r
WHERE r.id = mp.recipe_id
  AND r.created_by IS NULL
  AND r.servings > 1
  AND mp.nutrition_per_portion IS NOT NULL;

-- 2. Les recettes de référence passent en valeurs pour la recette entière.
UPDATE recipes
SET calories = calories * servings,
    protein  = protein  * servings,
    carbs    = carbs    * servings,
    fat      = fat      * servings,
    updated_at = NOW()
WHERE created_by IS NULL
  AND servings > 1;
