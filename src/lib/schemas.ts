import { z } from "zod";
import { isMatch } from "date-fns";
import { MEAL_LABELS, type MealType } from "./food-journal";
import { ACTIVITY_LEVEL_KEYS, GENDERS, NUTRITION_GOALS, SPORT_TYPE_KEYS } from "./nutrition";

/* ---------- Briques communes ---------- */

const PG_INT_MAX = 2147483647;

/** "", null et undefined comptent comme « non renseigné ». */
const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

/** Nombre, éventuellement envoyé en texte par un formulaire ("72", "72,5"). */
const numeric = (value: unknown) => {
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(",", ".").trim());
    return Number.isNaN(n) ? value : n;
  }
  return value;
};

export const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => numeric(blankToUndefined(value)), schema.optional());

export const requiredNumber = (schema: z.ZodNumber) => z.preprocess(numeric, schema);

/** Identifiant SERIAL Postgres (accepte "12" comme 12). */
export const id = z.preprocess(
  numeric,
  z
    .number({ error: (issue) => (issue.input === undefined ? "Identifiant requis" : "Identifiant invalide") })
    .int("Identifiant invalide")
    .positive("Identifiant invalide")
    .max(PG_INT_MAX, "Identifiant invalide")
);

/** Texte nettoyé (espaces de début et de fin retirés). */
export const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);
export const requiredText = (max: number, label = "Ce champ") =>
  z.string({ error: `${label} est requis` }).trim().min(1, `${label} est requis`).max(max, `${max} caractères maximum`);
export const optionalText = (max: number) => z.preprocess(blankToUndefined, text(max).optional());

/** Date calendaire AAAA-MM-JJ valide (2026-02-30 est refusé). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
  .refine((value) => isMatch(value, "yyyy-MM-dd"), "Date invalide");

export const mealType = z.enum(Object.keys(MEAL_LABELS) as [MealType, ...MealType[]], { error: "Repas invalide" });

export const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => /^https:\/\//i.test(value), "L'URL doit commencer par https://");

/* ---------- Profil et authentification ---------- */

export const gender = z.enum(GENDERS, { error: "Sexe invalide" });
export const activityLevel = z.enum(ACTIVITY_LEVEL_KEYS as [string, ...string[]], { error: "Niveau d'activité invalide" });
export const sportType = z.enum(SPORT_TYPE_KEYS as [string, ...string[]], { error: "Type de sport invalide" });
export const nutritionGoal = z.enum(NUTRITION_GOALS as [string, ...string[]], { error: "Objectif invalide." });

const age = z.number().int("L'âge doit être un nombre entier").min(10, "L'âge doit être entre 10 et 120 ans").max(120, "L'âge doit être entre 10 et 120 ans");
const weight = z.number().min(20, "Le poids doit être entre 20 et 300 kg").max(300, "Le poids doit être entre 20 et 300 kg");
const height = z.number().min(100, "La taille doit être entre 100 et 250 cm").max(250, "La taille doit être entre 100 et 250 cm");

export const email = z.string({ error: "email est requis" }).trim().toLowerCase().max(254).pipe(z.email("Email invalide"));
export const newPassword = z
  .string({ error: "password est requis" })
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(200, "Le mot de passe ne doit pas dépasser 200 caractères");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).default(""),
  password: z.string().max(200).default(""),
});

const profileFields = {
  age: optionalNumber(age),
  weight: optionalNumber(weight),
  height: optionalNumber(height),
  gender: z.preprocess(blankToUndefined, gender.optional()),
  activity_level: z.preprocess(blankToUndefined, activityLevel.optional()),
  sport_type: z.preprocess(blankToUndefined, sportType.optional()),
  nutrition_goal: z.preprocess(blankToUndefined, nutritionGoal.optional()),
};

export const registerSchema = z.object({
  email,
  password: newPassword,
  first_name: requiredText(100, "first_name"),
  last_name: requiredText(100, "last_name"),
  ...profileFields,
});

export const profileUpdateSchema = z.object({
  first_name: z.preprocess(blankToUndefined, requiredText(100, "first_name").optional()),
  last_name: z.preprocess(blankToUndefined, requiredText(100, "last_name").optional()),
  ...profileFields,
  daily_calorie_goal: optionalNumber(z.number().int().min(500, "Objectif calorique entre 500 et 10000 kcal").max(10000, "Objectif calorique entre 500 et 10000 kcal")),
  daily_protein_goal: optionalNumber(z.number().min(0).max(1000)),
  daily_carbs_goal: optionalNumber(z.number().min(0).max(1000)),
  daily_fat_goal: optionalNumber(z.number().min(0).max(1000)),
});

export const nutritionCalculateSchema = z.object({
  age: requiredNumber(age),
  weight: requiredNumber(weight),
  height: requiredNumber(height),
  gender,
  activity_level: activityLevel,
  sport_type: z.preprocess(blankToUndefined, sportType.optional()),
  nutrition_goal: z.preprocess(blankToUndefined, nutritionGoal.default("maintien")),
});

export const dinnerExclusionSchema = z.object({ id, excluded: z.boolean({ error: "excluded doit être un booléen" }) });

/* ---------- Ingrédients et garde-manger ---------- */

const per100g = optionalNumber(z.number().min(0).max(1000, "Valeur pour 100 g entre 0 et 1000"));

export const ingredientCreateSchema = z.object({
  name: requiredText(200, "name"),
  barcode: optionalText(50),
  calories: per100g,
  protein: per100g,
  carbs: per100g,
  fat: per100g,
  fiber: per100g,
  unit: optionalText(20),
  image_url: z.preprocess(blankToUndefined, httpsUrl.optional()),
  brand: optionalText(200),
  category: optionalText(100),
});

export const ingredientQuerySchema = z.object({
  id: id.optional(),
  search: optionalText(100),
});

export const pantryAddSchema = z.object({
  ingredient_id: id,
  quantity: optionalNumber(z.number().positive("La quantité doit être positive").max(100000)),
  unit: optionalText(20),
});

export const idQuerySchema = z.object({ id });

/* ---------- Recettes ---------- */

const minutes = optionalNumber(z.number().int().min(0).max(1440, "Durée maximale : 1440 minutes"));
const servings = optionalNumber(z.number().int("Nombre de portions entier").min(1).max(100));

export const recipeCreateSchema = z.object({
  name: requiredText(200, "name"),
  description: optionalText(2000),
  instructions: optionalText(5000),
  prep_time: minutes,
  cook_time: minutes,
  servings,
  image_url: z.preprocess(blankToUndefined, httpsUrl.optional()),
  is_public: z.boolean().optional(),
  ingredients: z
    .array(
      z.object({
        ingredient_id: id,
        quantity: requiredNumber(z.number().positive("Chaque ingrédient doit avoir une quantité positive").max(100000)),
        unit: optionalText(20),
      })
    )
    .max(100, "100 ingrédients maximum")
    .default([])
    .refine(
      (items) => new Set(items.map((item) => item.ingredient_id)).size === items.length,
      "Chaque ingrédient doit apparaître une seule fois."
    ),
});

export const ratingSchema = z.object({
  recipe_id: id,
  rating: z.number({ error: "rating est requis" }).int("La note doit être un entier entre 1 et 5").min(1, "La note doit être un entier entre 1 et 5").max(5, "La note doit être un entier entre 1 et 5"),
  comment: z.preprocess(blankToUndefined, z.string().max(1000, "Le commentaire ne doit pas dépasser 1000 caractères").optional()),
});

export const favoriteSchema = z.object({ recipe_id: id });
export const favoriteDeleteQuerySchema = z.object({ recipeId: id });

export const similarRecipesSchema = z.object({
  recipeId: id,
  limit: optionalNumber(z.number().int().min(1).max(20)),
});

/** Import d'un export TodoCook : seules les recettes sont importées. */
export const IMPORT_MAX_RECIPES = 200;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
const IMPORT_FORMAT_ERROR = "Fichier d'import invalide : un export TodoCook (liste « recipes ») est attendu.";

const nutrientTotal = optionalNumber(z.number().min(0).max(100000));

export const importSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: requiredText(200, "Nom de recette"),
        description: optionalText(2000),
        instructions: optionalText(5000),
        prep_time: minutes,
        cook_time: minutes,
        servings,
        calories: nutrientTotal,
        protein: nutrientTotal,
        carbs: nutrientTotal,
        fat: nutrientTotal,
        // L'export produit [{ name: null, … }] pour une recette sans ingrédient : ces entrées sont ignorées
        ingredients: z.preprocess(
          (value) => (Array.isArray(value) ? value.filter((item) => item && item.name != null) : value ?? []),
          z
            .array(
              z.object({
                name: requiredText(200, "Nom d'ingrédient"),
                quantity: optionalNumber(z.number().positive().max(100000)),
                unit: optionalText(20),
              })
            )
            .max(100, "100 ingrédients maximum par recette")
        ),
      }),
      { error: IMPORT_FORMAT_ERROR }
    )
    .max(IMPORT_MAX_RECIPES, `${IMPORT_MAX_RECIPES} recettes maximum par import`),
}, { error: IMPORT_FORMAT_ERROR });

/* ---------- Planning et journal ---------- */

const portions = (max: number) => z.number().min(0).max(max, `${max} portions maximum`);

export const mealPlanCreateSchema = z.object({
  recipe_id: id,
  date: isoDate,
  meal_type: mealType.default("dejeuner"),
  planned_portions: optionalNumber(portions(100).positive("Portion prévue invalide")).transform((value) => value ?? 1),
});

export const mealPlanConsumeSchema = z.object({
  id,
  portions: requiredNumber(portions(100)),
});

export const dateRangeQuerySchema = z.object({
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
});

export const foodJournalCreateSchema = z.object({
  date: isoDate,
  meal_type: mealType,
  grams: z.number({ error: "Quantité en grammes requise" }).positive("La quantité doit être positive").max(10000, "10 000 g maximum"),
  ingredient_id: id,
  entry_key: z.uuid("Clé de saisie invalide"),
});

export const foodJournalUpdateSchema = z.object({
  id,
  grams: z.number({ error: "Quantité en grammes requise" }).positive("La quantité doit être positive").max(10000, "10 000 g maximum"),
  meal_type: mealType,
});

export const dateQuerySchema = z.object({ date: isoDate });

/* ---------- Listes de courses ---------- */

export const shoppingListCreateSchema = z.object({ title: requiredText(200, "Le titre") });
export const shoppingListUpdateSchema = z.object({ title: requiredText(200, "Le titre").optional() });
export const shoppingItemCreateSchema = z.object({ name: requiredText(200, "Le nom") });
export const shoppingItemUpdateSchema = z.object({ checked: z.boolean({ error: "checked doit être un booléen" }) });
export const listParamsSchema = z.object({ id });
export const listItemParamsSchema = z.object({ id, itemId: id });
