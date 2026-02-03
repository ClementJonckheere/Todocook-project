import { query } from "./db";

let seeded = false;

export async function seedDatabase() {
  if (seeded) return;
  seeded = true;

  const { rows } = await query("SELECT COUNT(*) as count FROM users");
  if (parseInt(rows[0].count) > 0) return;

  // Create default user
  await query(
    `INSERT INTO users (email, first_name, last_name, age, weight, height, gender, activity_level, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    ["clement@todocook.fr", "Clément", "Jonckheere", 25, 75, 180, "homme", "modere", 2200, 60, 275, 75]
  );

  // Seed ingredients
  const ingredients = [
    { name: "Poulet (blanc)", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, unit: "g", category: "Viande" },
    { name: "Riz blanc", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, unit: "g", category: "Féculents" },
    { name: "Pâtes", calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, unit: "g", category: "Féculents" },
    { name: "Tomate", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, unit: "g", category: "Légumes" },
    { name: "Oignon", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, unit: "g", category: "Légumes" },
    { name: "Ail", calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, unit: "g", category: "Légumes" },
    { name: "Huile d'olive", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, unit: "ml", category: "Huiles" },
    { name: "Sel", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, unit: "g", category: "Épices" },
    { name: "Poivre", calories: 251, protein: 10, carbs: 44, fat: 3.3, fiber: 25, unit: "g", category: "Épices" },
    { name: "Beurre", calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, unit: "g", category: "Produits laitiers" },
    { name: "Lait", calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, unit: "ml", category: "Produits laitiers" },
    { name: "Oeuf", calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, unit: "pièce", category: "Oeufs" },
    { name: "Farine", calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7, unit: "g", category: "Féculents" },
    { name: "Sucre", calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0, unit: "g", category: "Épicerie" },
    { name: "Carotte", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, unit: "g", category: "Légumes" },
    { name: "Pomme de terre", calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, unit: "g", category: "Féculents" },
    { name: "Courgette", calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, unit: "g", category: "Légumes" },
    { name: "Poivron rouge", calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, unit: "g", category: "Légumes" },
    { name: "Saumon", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, unit: "g", category: "Poisson" },
    { name: "Crème fraîche", calories: 292, protein: 2.1, carbs: 2.8, fat: 30, fiber: 0, unit: "g", category: "Produits laitiers" },
    { name: "Fromage râpé", calories: 380, protein: 25, carbs: 1.5, fat: 30, fiber: 0, unit: "g", category: "Produits laitiers" },
    { name: "Champignon", calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, unit: "g", category: "Légumes" },
    { name: "Lardons", calories: 260, protein: 15, carbs: 0.5, fat: 22, fiber: 0, unit: "g", category: "Viande" },
    { name: "Thon en boîte", calories: 132, protein: 29, carbs: 0, fat: 1.2, fiber: 0, unit: "g", category: "Poisson" },
    { name: "Pain", calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, unit: "g", category: "Boulangerie" },
  ];

  for (const ing of ingredients) {
    await query(
      `INSERT INTO ingredients (name, calories, protein, carbs, fat, fiber, unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ing.name, ing.calories, ing.protein, ing.carbs, ing.fat, ing.fiber, ing.unit, ing.category]
    );
  }

  // Helper to get ingredient ID by name
  async function getIngId(name: string): Promise<number | null> {
    const { rows } = await query("SELECT id FROM ingredients WHERE name = $1", [name]);
    return rows[0]?.id ?? null;
  }

  // Seed recipes
  const recipes = [
    {
      name: "Poulet grillé aux légumes",
      description: "Un classique sain et savoureux avec poulet et légumes de saison",
      instructions: "1. Préchauffer le four à 200°C\n2. Couper les légumes en morceaux\n3. Assaisonner le poulet avec sel, poivre et huile d'olive\n4. Disposer le tout sur une plaque\n5. Cuire 35-40 minutes",
      prepTime: 15, cookTime: 40, servings: 2, calories: 450, protein: 42, carbs: 25, fat: 18,
      ingredients: [
        { name: "Poulet (blanc)", quantity: 300, unit: "g" },
        { name: "Courgette", quantity: 200, unit: "g" },
        { name: "Poivron rouge", quantity: 150, unit: "g" },
        { name: "Huile d'olive", quantity: 15, unit: "ml" },
        { name: "Sel", quantity: 2, unit: "g" },
        { name: "Poivre", quantity: 1, unit: "g" },
      ]
    },
    {
      name: "Pâtes carbonara",
      description: "La recette traditionnelle italienne",
      instructions: "1. Cuire les pâtes al dente\n2. Faire revenir les lardons\n3. Mélanger oeufs et fromage râpé\n4. Hors du feu, mélanger pâtes, lardons et mélange oeuf-fromage\n5. Poivrer généreusement",
      prepTime: 10, cookTime: 15, servings: 2, calories: 580, protein: 28, carbs: 55, fat: 26,
      ingredients: [
        { name: "Pâtes", quantity: 250, unit: "g" },
        { name: "Lardons", quantity: 150, unit: "g" },
        { name: "Oeuf", quantity: 3, unit: "pièce" },
        { name: "Fromage râpé", quantity: 50, unit: "g" },
        { name: "Poivre", quantity: 2, unit: "g" },
      ]
    },
    {
      name: "Saumon et riz",
      description: "Pavé de saumon avec riz et sauce crème",
      instructions: "1. Cuire le riz\n2. Poêler le saumon 4 min de chaque côté\n3. Faire une sauce avec crème fraîche et ail\n4. Servir le saumon sur le riz avec la sauce",
      prepTime: 10, cookTime: 20, servings: 2, calories: 520, protein: 35, carbs: 45, fat: 22,
      ingredients: [
        { name: "Saumon", quantity: 300, unit: "g" },
        { name: "Riz blanc", quantity: 200, unit: "g" },
        { name: "Crème fraîche", quantity: 50, unit: "g" },
        { name: "Ail", quantity: 5, unit: "g" },
        { name: "Sel", quantity: 2, unit: "g" },
      ]
    },
    {
      name: "Omelette aux champignons",
      description: "Omelette moelleuse garnie de champignons frais",
      instructions: "1. Émincer les champignons\n2. Les faire revenir au beurre\n3. Battre les oeufs avec sel et poivre\n4. Verser sur les champignons\n5. Cuire à feu doux 5 minutes",
      prepTime: 5, cookTime: 10, servings: 1, calories: 320, protein: 22, carbs: 5, fat: 24,
      ingredients: [
        { name: "Oeuf", quantity: 3, unit: "pièce" },
        { name: "Champignon", quantity: 150, unit: "g" },
        { name: "Beurre", quantity: 15, unit: "g" },
        { name: "Sel", quantity: 1, unit: "g" },
        { name: "Poivre", quantity: 1, unit: "g" },
      ]
    },
    {
      name: "Soupe de légumes",
      description: "Soupe maison avec carottes, pommes de terre et oignons",
      instructions: "1. Éplucher et couper les légumes\n2. Faire revenir l'oignon dans le beurre\n3. Ajouter les légumes et couvrir d'eau\n4. Cuire 30 minutes\n5. Mixer et assaisonner",
      prepTime: 15, cookTime: 30, servings: 4, calories: 180, protein: 4, carbs: 32, fat: 5,
      ingredients: [
        { name: "Carotte", quantity: 300, unit: "g" },
        { name: "Pomme de terre", quantity: 300, unit: "g" },
        { name: "Oignon", quantity: 100, unit: "g" },
        { name: "Beurre", quantity: 20, unit: "g" },
        { name: "Sel", quantity: 3, unit: "g" },
      ]
    },
    {
      name: "Salade de thon",
      description: "Salade fraîche et protéinée au thon",
      instructions: "1. Égoutter le thon\n2. Couper les tomates et l'oignon\n3. Mélanger le tout\n4. Assaisonner avec huile d'olive, sel et poivre",
      prepTime: 10, cookTime: 0, servings: 1, calories: 280, protein: 32, carbs: 8, fat: 14,
      ingredients: [
        { name: "Thon en boîte", quantity: 130, unit: "g" },
        { name: "Tomate", quantity: 200, unit: "g" },
        { name: "Oignon", quantity: 50, unit: "g" },
        { name: "Huile d'olive", quantity: 10, unit: "ml" },
        { name: "Sel", quantity: 1, unit: "g" },
      ]
    },
    {
      name: "Gratin de pâtes",
      description: "Pâtes gratinées au fromage et béchamel",
      instructions: "1. Cuire les pâtes\n2. Préparer une béchamel avec beurre, farine et lait\n3. Mélanger pâtes et béchamel\n4. Ajouter le fromage râpé\n5. Gratiner au four 15 minutes à 200°C",
      prepTime: 15, cookTime: 30, servings: 4, calories: 520, protein: 20, carbs: 60, fat: 22,
      ingredients: [
        { name: "Pâtes", quantity: 400, unit: "g" },
        { name: "Beurre", quantity: 40, unit: "g" },
        { name: "Farine", quantity: 40, unit: "g" },
        { name: "Lait", quantity: 500, unit: "ml" },
        { name: "Fromage râpé", quantity: 100, unit: "g" },
      ]
    },
    {
      name: "Riz sauté aux légumes",
      description: "Riz sauté façon asiatique avec légumes croquants",
      instructions: "1. Cuire le riz et le laisser refroidir\n2. Couper tous les légumes en petits dés\n3. Faire sauter les légumes à feu vif avec huile\n4. Ajouter le riz et mélanger\n5. Assaisonner",
      prepTime: 10, cookTime: 15, servings: 2, calories: 350, protein: 8, carbs: 55, fat: 10,
      ingredients: [
        { name: "Riz blanc", quantity: 250, unit: "g" },
        { name: "Carotte", quantity: 100, unit: "g" },
        { name: "Courgette", quantity: 100, unit: "g" },
        { name: "Oignon", quantity: 80, unit: "g" },
        { name: "Huile d'olive", quantity: 15, unit: "ml" },
        { name: "Sel", quantity: 2, unit: "g" },
      ]
    },
    {
      name: "Croque-monsieur",
      description: "Le classique sandwich chaud gratiné",
      instructions: "1. Beurrer les tranches de pain\n2. Garnir avec fromage et lardons\n3. Refermer le sandwich\n4. Griller au four ou à la poêle jusqu'à ce que le fromage fonde",
      prepTime: 5, cookTime: 10, servings: 1, calories: 420, protein: 22, carbs: 32, fat: 24,
      ingredients: [
        { name: "Pain", quantity: 80, unit: "g" },
        { name: "Fromage râpé", quantity: 40, unit: "g" },
        { name: "Beurre", quantity: 10, unit: "g" },
        { name: "Lardons", quantity: 50, unit: "g" },
      ]
    },
    {
      name: "Purée de pommes de terre",
      description: "Purée maison onctueuse",
      instructions: "1. Éplucher et couper les pommes de terre\n2. Les cuire à l'eau salée 20 minutes\n3. Écraser avec beurre et lait\n4. Assaisonner sel et poivre",
      prepTime: 10, cookTime: 25, servings: 4, calories: 220, protein: 4, carbs: 30, fat: 10,
      ingredients: [
        { name: "Pomme de terre", quantity: 800, unit: "g" },
        { name: "Beurre", quantity: 50, unit: "g" },
        { name: "Lait", quantity: 100, unit: "ml" },
        { name: "Sel", quantity: 3, unit: "g" },
        { name: "Poivre", quantity: 1, unit: "g" },
      ]
    },
    {
      name: "Poulet curry et riz",
      description: "Poulet mijoté dans une sauce curry onctueuse",
      instructions: "1. Couper le poulet en morceaux\n2. Faire revenir l'oignon et l'ail\n3. Ajouter le poulet et le curry\n4. Ajouter la crème fraîche\n5. Mijoter 20 minutes, servir avec du riz",
      prepTime: 10, cookTime: 25, servings: 2, calories: 550, protein: 40, carbs: 50, fat: 20,
      ingredients: [
        { name: "Poulet (blanc)", quantity: 300, unit: "g" },
        { name: "Riz blanc", quantity: 200, unit: "g" },
        { name: "Crème fraîche", quantity: 100, unit: "g" },
        { name: "Oignon", quantity: 80, unit: "g" },
        { name: "Ail", quantity: 5, unit: "g" },
      ]
    },
    {
      name: "Tartine au saumon",
      description: "Tartine gourmande au saumon et crème fraîche",
      instructions: "1. Toaster le pain\n2. Tartiner la crème fraîche\n3. Disposer le saumon par-dessus\n4. Assaisonner",
      prepTime: 5, cookTime: 2, servings: 1, calories: 380, protein: 24, carbs: 28, fat: 18,
      ingredients: [
        { name: "Pain", quantity: 60, unit: "g" },
        { name: "Saumon", quantity: 100, unit: "g" },
        { name: "Crème fraîche", quantity: 30, unit: "g" },
        { name: "Sel", quantity: 1, unit: "g" },
      ]
    },
  ];

  for (const recipe of recipes) {
    const { rows: recipeRows } = await query(
      `INSERT INTO recipes (name, description, instructions, prep_time, cook_time, servings, calories, protein, carbs, fat, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) RETURNING id`,
      [recipe.name, recipe.description, recipe.instructions, recipe.prepTime, recipe.cookTime, recipe.servings, recipe.calories, recipe.protein, recipe.carbs, recipe.fat]
    );
    const recipeId = recipeRows[0].id;

    for (const ing of recipe.ingredients) {
      const ingId = await getIngId(ing.name);
      if (ingId) {
        await query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)`,
          [recipeId, ingId, ing.quantity, ing.unit]
        );
      }
    }
  }

  // Add some pantry items for the default user
  const pantryItems = [
    { ingredient: "Pâtes", quantity: 500 },
    { ingredient: "Riz blanc", quantity: 500 },
    { ingredient: "Huile d'olive", quantity: 250 },
    { ingredient: "Sel", quantity: 200 },
    { ingredient: "Poivre", quantity: 50 },
    { ingredient: "Oignon", quantity: 300 },
    { ingredient: "Ail", quantity: 50 },
    { ingredient: "Oeuf", quantity: 6 },
    { ingredient: "Beurre", quantity: 125 },
    { ingredient: "Farine", quantity: 500 },
  ];

  for (const item of pantryItems) {
    const ingId = await getIngId(item.ingredient);
    if (ingId) {
      await query(
        `INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit) VALUES ($1, $2, $3, $4)`,
        [1, ingId, item.quantity, "g"]
      );
    }
  }

  // Add some daily logs for the last 30 days
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const calories = 1800 + Math.floor(Math.random() * 600);
    const protein = 40 + Math.floor(Math.random() * 40);
    const carbs = 200 + Math.floor(Math.random() * 100);
    const fat = 50 + Math.floor(Math.random() * 40);

    await query(
      `INSERT INTO daily_logs (user_id, date, calories, protein, carbs, fat) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, date) DO NOTHING`,
      [1, dateStr, calories, protein, carbs, fat]
    );
  }

  // Add some meal plans for this week
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - date.getDay() + 1 + i);
    const dateStr = date.toISOString().split("T")[0];
    const recipeId = (i % 12) + 1;
    await query(
      `INSERT INTO meal_plans (user_id, recipe_id, date, meal_type) VALUES ($1, $2, $3, $4)`,
      [1, recipeId, dateStr, i < 5 ? "dejeuner" : "diner"]
    );
  }
}
