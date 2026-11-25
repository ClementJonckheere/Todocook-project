-- 004 : la recette « Toast avocat-oeuf » des données de référence n'avait pas d'avocat
-- dans ses ingrédients (ses valeurs nutritionnelles en tenaient déjà compte).
-- Corrige les bases déjà initialisées ; sans effet si la recette n'existe pas
-- (les nouvelles bases reçoivent l'ingrédient par `npm run db:seed`).

-- Ingrédient générique Avocat (valeurs pour 100 g), créé s'il n'existe pas déjà
INSERT INTO ingredients (name, calories, protein, carbs, fat, fiber, unit, category)
SELECT 'Avocat', 160, 2, 8.5, 14.7, 6.7, 'g', 'Fruits'
WHERE EXISTS (SELECT 1 FROM recipes WHERE name = 'Toast avocat-oeuf')
  AND NOT EXISTS (SELECT 1 FROM ingredients WHERE name = 'Avocat' AND barcode IS NULL);

-- Un demi-avocat (environ 70 g de chair) par toast
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
SELECT r.id, a.id, 70 * GREATEST(r.servings, 1), 'g'
FROM recipes r
CROSS JOIN LATERAL (
  SELECT id FROM ingredients WHERE name = 'Avocat' AND barcode IS NULL ORDER BY id LIMIT 1
) a
WHERE r.name = 'Toast avocat-oeuf'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
