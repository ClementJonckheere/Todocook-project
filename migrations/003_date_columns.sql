-- 003 : les colonnes "date" passent de TEXT à DATE (tri, filtres et outils BI fiables),
-- et l'ancienne table daily_logs, remplacée par la vue consumed_daily_totals, est renommée
-- legacy_daily_logs (ses données sont conservées et restent exportables).
DROP VIEW IF EXISTS consumed_daily_totals;

ALTER TABLE meal_plans ALTER COLUMN date TYPE DATE USING date::date;
ALTER TABLE food_journal ALTER COLUMN date TYPE DATE USING date::date;
ALTER TABLE daily_logs ALTER COLUMN date TYPE DATE USING date::date;

ALTER TABLE daily_logs RENAME TO legacy_daily_logs;
COMMENT ON TABLE legacy_daily_logs IS
  'Ancienne saisie manuelle des totaux journaliers, remplacée par la vue consumed_daily_totals. Lecture seule.';

CREATE VIEW consumed_daily_totals AS
  SELECT user_id, date, SUM(calories) AS calories, SUM(protein) AS protein,
    SUM(carbs) AS carbs, SUM(fat) AS fat
  FROM (
    SELECT user_id, date,
      consumed_portions * (nutrition_per_portion->>'calories')::float8 AS calories,
      consumed_portions * (nutrition_per_portion->>'protein')::float8 AS protein,
      consumed_portions * (nutrition_per_portion->>'carbs')::float8 AS carbs,
      consumed_portions * (nutrition_per_portion->>'fat')::float8 AS fat
    FROM meal_plans WHERE consumed_portions > 0
    UNION ALL
    SELECT user_id, date, calories_100g * grams / 100, protein_100g * grams / 100,
      carbs_100g * grams / 100, fat_100g * grams / 100
    FROM food_journal
  ) consumed
  GROUP BY user_id, date;
COMMENT ON VIEW consumed_daily_totals IS
  'Totaux nutritionnels réellement consommés par utilisateur et par jour (repas planifiés consommés + journal alimentaire).';
