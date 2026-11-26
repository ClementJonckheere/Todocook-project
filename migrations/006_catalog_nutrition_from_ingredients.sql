-- 006 : les valeurs nutritionnelles des recettes de référence (seed) avaient été saisies à la main,
-- alors que les recettes créées dans l'application sont calculées à partir de leurs ingrédients.
-- Une même recette pouvait donc donner deux bilans différents (soupe de légumes : 180 kcal par
-- portion saisis, 134 kcal calculés). Mesure sur les 29 recettes : écart médian +2 %,
-- de -29 % à +35 %, toutes calculables.
--
-- Les recettes de référence (created_by IS NULL) sont recalculées avec la même règle que
-- computeRecipeNutrition (src/lib/recipe-nutrition.ts) et gramsPerUnit (src/lib/recipe-portions.ts) :
-- valeurs pour 100 g × quantité en grammes, pour la recette entière ; kcal arrondies à l'unité,
-- macros au dixième. Une recette dont une quantité n'est pas convertible en grammes est laissée telle
-- quelle. Les recettes des utilisateurs (déjà calculées ainsi) et les repas déjà consommés
-- (valeurs figées au moment du repas) ne sont pas modifiés.
WITH lines AS (
  SELECT
    ri.recipe_id,
    ri.quantity,
    i.calories, i.protein, i.carbs, i.fat,
    CASE
      WHEN COALESCE(ri.unit, 'g') = 'g' THEN 1
      WHEN ri.unit = 'kg' THEN 1000
      WHEN i.barcode IS NOT NULL OR i.unit IS DISTINCT FROM ri.unit THEN NULL
      WHEN ri.unit = 'pièce' AND i.name = 'Oeuf' THEN 50
      WHEN ri.unit = 'ml' AND i.name = 'Huile d''olive' THEN 0.91
      WHEN ri.unit = 'ml' AND i.name = 'Lait' THEN 1.03
    END AS grams_per_unit
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.id = ri.ingredient_id
  JOIN recipes r ON r.id = ri.recipe_id
  WHERE r.created_by IS NULL
),
totals AS (
  SELECT
    recipe_id,
    bool_and(grams_per_unit IS NOT NULL) AS convertible,
    SUM(calories * quantity * grams_per_unit / 100) AS calories,
    SUM(protein  * quantity * grams_per_unit / 100) AS protein,
    SUM(carbs    * quantity * grams_per_unit / 100) AS carbs,
    SUM(fat      * quantity * grams_per_unit / 100) AS fat
  FROM lines
  GROUP BY recipe_id
)
UPDATE recipes r
SET calories = round(t.calories::numeric),
    protein  = round(t.protein::numeric, 1),
    carbs    = round(t.carbs::numeric, 1),
    fat      = round(t.fat::numeric, 1),
    updated_at = NOW()
FROM totals t
WHERE r.id = t.recipe_id
  AND t.convertible;
