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
    // Light/Diet recipes
    {
      name: "Salade de poulet grillé",
      description: "Salade fraîche et légère riche en protéines",
      instructions: "1. Griller le poulet assaisonné\n2. Couper les tomates et le poivron\n3. Mélanger tous les légumes\n4. Ajouter le poulet tranché\n5. Assaisonner avec huile d'olive",
      prepTime: 10, cookTime: 15, servings: 1, calories: 320, protein: 38, carbs: 12, fat: 14,
      ingredients: [
        { name: "Poulet (blanc)", quantity: 150, unit: "g" },
        { name: "Tomate", quantity: 150, unit: "g" },
        { name: "Poivron rouge", quantity: 100, unit: "g" },
        { name: "Huile d'olive", quantity: 10, unit: "ml" },
        { name: "Sel", quantity: 1, unit: "g" },
      ]
    },
    {
      name: "Courgettes farcies au thon",
      description: "Courgettes légères farcies au thon et fromage",
      instructions: "1. Évider les courgettes\n2. Mélanger le thon avec la crème fraîche\n3. Farcir les courgettes\n4. Gratiner avec le fromage\n5. Cuire 20 min à 180°C",
      prepTime: 15, cookTime: 20, servings: 2, calories: 280, protein: 28, carbs: 8, fat: 15,
      ingredients: [
        { name: "Courgette", quantity: 400, unit: "g" },
        { name: "Thon en boîte", quantity: 200, unit: "g" },
        { name: "Crème fraîche", quantity: 30, unit: "g" },
        { name: "Fromage râpé", quantity: 40, unit: "g" },
        { name: "Sel", quantity: 2, unit: "g" },
      ]
    },
    {
      name: "Oeufs pochés aux légumes",
      description: "Oeufs pochés sur lit de légumes sautés",
      instructions: "1. Faire sauter les champignons et courgettes\n2. Pocher les oeufs dans l'eau frémissante\n3. Dresser les légumes sur assiette\n4. Déposer les oeufs pochés\n5. Assaisonner",
      prepTime: 10, cookTime: 10, servings: 1, calories: 250, protein: 18, carbs: 8, fat: 16,
      ingredients: [
        { name: "Oeuf", quantity: 2, unit: "pièce" },
        { name: "Champignon", quantity: 150, unit: "g" },
        { name: "Courgette", quantity: 100, unit: "g" },
        { name: "Beurre", quantity: 10, unit: "g" },
        { name: "Sel", quantity: 1, unit: "g" },
      ]
    },
    // High protein recipes
    {
      name: "Steak de thon et riz complet",
      description: "Steak de thon riche en protéines avec accompagnement",
      instructions: "1. Cuire le riz\n2. Saisir le thon 2 min de chaque côté\n3. L'intérieur doit rester rosé\n4. Servir avec le riz\n5. Arroser d'huile d'olive",
      prepTime: 5, cookTime: 20, servings: 1, calories: 480, protein: 45, carbs: 40, fat: 14,
      ingredients: [
        { name: "Thon en boîte", quantity: 200, unit: "g" },
        { name: "Riz blanc", quantity: 150, unit: "g" },
        { name: "Huile d'olive", quantity: 10, unit: "ml" },
        { name: "Sel", quantity: 2, unit: "g" },
        { name: "Poivre", quantity: 1, unit: "g" },
      ]
    },
    {
      name: "Poulet protéiné aux oeufs",
      description: "Bowl hyperprotéiné pour sportifs",
      instructions: "1. Griller le poulet en tranches\n2. Cuire les oeufs brouillés\n3. Faire revenir les champignons\n4. Assembler dans un bol\n5. Assaisonner",
      prepTime: 10, cookTime: 15, servings: 1, calories: 520, protein: 58, carbs: 6, fat: 30,
      ingredients: [
        { name: "Poulet (blanc)", quantity: 200, unit: "g" },
        { name: "Oeuf", quantity: 3, unit: "pièce" },
        { name: "Champignon", quantity: 100, unit: "g" },
        { name: "Beurre", quantity: 15, unit: "g" },
        { name: "Sel", quantity: 2, unit: "g" },
      ]
    },
    {
      name: "Saumon teriyaki",
      description: "Pavé de saumon glacé à la sauce teriyaki maison",
      instructions: "1. Préparer une sauce avec sucre et ail\n2. Poêler le saumon\n3. Glacer avec la sauce\n4. Servir avec du riz\n5. Saupoudrer de sel",
      prepTime: 10, cookTime: 15, servings: 2, calories: 480, protein: 36, carbs: 48, fat: 16,
      ingredients: [
        { name: "Saumon", quantity: 300, unit: "g" },
        { name: "Riz blanc", quantity: 200, unit: "g" },
        { name: "Sucre", quantity: 20, unit: "g" },
        { name: "Ail", quantity: 5, unit: "g" },
        { name: "Sel", quantity: 2, unit: "g" },
      ]
    },
    // Quick recipes
    {
      name: "Pâtes à l'ail et huile d'olive",
      description: "Aglio e olio - recette italienne express",
      instructions: "1. Cuire les pâtes al dente\n2. Faire revenir l'ail émincé dans l'huile\n3. Attention à ne pas brûler l'ail\n4. Mélanger avec les pâtes\n5. Poivrer généreusement",
      prepTime: 5, cookTime: 12, servings: 2, calories: 420, protein: 12, carbs: 58, fat: 16,
      ingredients: [
        { name: "Pâtes", quantity: 250, unit: "g" },
        { name: "Ail", quantity: 15, unit: "g" },
        { name: "Huile d'olive", quantity: 30, unit: "ml" },
        { name: "Poivre", quantity: 2, unit: "g" },
        { name: "Sel", quantity: 3, unit: "g" },
      ]
    },
    {
      name: "Omelette express",
      description: "Omelette simple et rapide pour repas pressé",
      instructions: "1. Battre les oeufs avec sel et poivre\n2. Faire fondre le beurre\n3. Verser les oeufs\n4. Cuire à feu moyen\n5. Plier et servir",
      prepTime: 2, cookTime: 5, servings: 1, calories: 280, protein: 18, carbs: 2, fat: 22,
      ingredients: [
        { name: "Oeuf", quantity: 3, unit: "pièce" },
        { name: "Beurre", quantity: 15, unit: "g" },
        { name: "Sel", quantity: 1, unit: "g" },
        { name: "Poivre", quantity: 1, unit: "g" },
      ]
    },
    {
      name: "Toast avocat-oeuf",
      description: "Toast healthy pour petit-déjeuner ou brunch",
      instructions: "1. Toaster le pain\n2. Écraser l'avocat avec une fourchette\n3. Tartiner sur le pain\n4. Ajouter l'oeuf poché ou au plat\n5. Saler et poivrer",
      prepTime: 5, cookTime: 5, servings: 1, calories: 350, protein: 14, carbs: 28, fat: 22,
      ingredients: [
        { name: "Pain", quantity: 60, unit: "g" },
        { name: "Oeuf", quantity: 1, unit: "pièce" },
        { name: "Huile d'olive", quantity: 5, unit: "ml" },
        { name: "Sel", quantity: 1, unit: "g" },
        { name: "Poivre", quantity: 1, unit: "g" },
      ]
    },
    // Hearty/Comfort food recipes
    {
      name: "Gratin dauphinois",
      description: "Le classique gratin de pommes de terre à la crème",
      instructions: "1. Éplucher et trancher les pommes de terre\n2. Mélanger crème et lait\n3. Disposer en couches dans un plat\n4. Verser le mélange crémeux\n5. Cuire 1h à 180°C",
      prepTime: 20, cookTime: 60, servings: 6, calories: 320, protein: 8, carbs: 35, fat: 18,
      ingredients: [
        { name: "Pomme de terre", quantity: 1000, unit: "g" },
        { name: "Crème fraîche", quantity: 200, unit: "g" },
        { name: "Lait", quantity: 200, unit: "ml" },
        { name: "Beurre", quantity: 30, unit: "g" },
        { name: "Sel", quantity: 5, unit: "g" },
      ]
    },
    {
      name: "Risotto aux champignons",
      description: "Risotto crémeux aux champignons de Paris",
      instructions: "1. Faire revenir l'oignon et l'ail\n2. Ajouter le riz et nacrer\n3. Mouiller progressivement\n4. Ajouter les champignons\n5. Finir avec beurre et fromage",
      prepTime: 10, cookTime: 25, servings: 2, calories: 450, protein: 14, carbs: 55, fat: 20,
      ingredients: [
        { name: "Riz blanc", quantity: 200, unit: "g" },
        { name: "Champignon", quantity: 200, unit: "g" },
        { name: "Oignon", quantity: 80, unit: "g" },
        { name: "Beurre", quantity: 30, unit: "g" },
        { name: "Fromage râpé", quantity: 50, unit: "g" },
      ]
    },
    {
      name: "Hachis parmentier",
      description: "Gratin de viande hachée et purée de pommes de terre",
      instructions: "1. Préparer une purée de pommes de terre\n2. Faire revenir l'oignon\n3. Ajouter les lardons et faire revenir\n4. Superposer viande et purée\n5. Gratiner au four 20 min",
      prepTime: 20, cookTime: 35, servings: 4, calories: 480, protein: 22, carbs: 38, fat: 26,
      ingredients: [
        { name: "Pomme de terre", quantity: 600, unit: "g" },
        { name: "Lardons", quantity: 200, unit: "g" },
        { name: "Oignon", quantity: 100, unit: "g" },
        { name: "Beurre", quantity: 40, unit: "g" },
        { name: "Fromage râpé", quantity: 80, unit: "g" },
      ]
    },
    // Vegetarian options
    {
      name: "Poêlée de légumes",
      description: "Mélange coloré de légumes sautés",
      instructions: "1. Couper tous les légumes en morceaux\n2. Chauffer l'huile dans une poêle\n3. Faire sauter les légumes à feu vif\n4. Assaisonner\n5. Servir chaud",
      prepTime: 15, cookTime: 15, servings: 2, calories: 180, protein: 5, carbs: 20, fat: 10,
      ingredients: [
        { name: "Courgette", quantity: 200, unit: "g" },
        { name: "Poivron rouge", quantity: 150, unit: "g" },
        { name: "Carotte", quantity: 100, unit: "g" },
        { name: "Oignon", quantity: 80, unit: "g" },
        { name: "Huile d'olive", quantity: 20, unit: "ml" },
      ]
    },
    {
      name: "Pâtes aux légumes",
      description: "Pâtes végétariennes aux légumes du jardin",
      instructions: "1. Cuire les pâtes\n2. Faire revenir les légumes\n3. Mélanger pâtes et légumes\n4. Ajouter un filet d'huile d'olive\n5. Saupoudrer de fromage râpé",
      prepTime: 10, cookTime: 20, servings: 2, calories: 380, protein: 14, carbs: 58, fat: 12,
      ingredients: [
        { name: "Pâtes", quantity: 250, unit: "g" },
        { name: "Courgette", quantity: 150, unit: "g" },
        { name: "Tomate", quantity: 150, unit: "g" },
        { name: "Huile d'olive", quantity: 15, unit: "ml" },
        { name: "Fromage râpé", quantity: 30, unit: "g" },
      ]
    },
    {
      name: "Oeufs à la florentine",
      description: "Oeufs pochés sur un lit d'épinards crémeux",
      instructions: "1. Faire revenir l'ail dans le beurre\n2. Ajouter les champignons (comme épinards)\n3. Incorporer la crème fraîche\n4. Pocher les oeufs\n5. Dresser les oeufs sur les légumes",
      prepTime: 10, cookTime: 15, servings: 2, calories: 320, protein: 18, carbs: 8, fat: 25,
      ingredients: [
        { name: "Oeuf", quantity: 4, unit: "pièce" },
        { name: "Champignon", quantity: 200, unit: "g" },
        { name: "Crème fraîche", quantity: 60, unit: "g" },
        { name: "Beurre", quantity: 20, unit: "g" },
        { name: "Ail", quantity: 5, unit: "g" },
      ]
    },
    // Fish recipes
    {
      name: "Papillote de saumon",
      description: "Saumon cuit en papillote avec légumes",
      instructions: "1. Préparer des feuilles de papier cuisson\n2. Disposer le saumon et les légumes\n3. Assaisonner\n4. Fermer les papillotes\n5. Cuire 20 min à 200°C",
      prepTime: 10, cookTime: 20, servings: 2, calories: 380, protein: 32, carbs: 12, fat: 22,
      ingredients: [
        { name: "Saumon", quantity: 300, unit: "g" },
        { name: "Courgette", quantity: 150, unit: "g" },
        { name: "Carotte", quantity: 100, unit: "g" },
        { name: "Huile d'olive", quantity: 15, unit: "ml" },
        { name: "Sel", quantity: 2, unit: "g" },
      ]
    },
    {
      name: "Fish and chips maison",
      description: "Poisson pané croustillant avec frites",
      instructions: "1. Préparer les frites de pommes de terre\n2. Paner le poisson (farine, oeuf)\n3. Frire les frites\n4. Frire le poisson\n5. Servir avec sel",
      prepTime: 20, cookTime: 25, servings: 2, calories: 580, protein: 28, carbs: 55, fat: 28,
      ingredients: [
        { name: "Saumon", quantity: 250, unit: "g" },
        { name: "Pomme de terre", quantity: 400, unit: "g" },
        { name: "Farine", quantity: 50, unit: "g" },
        { name: "Oeuf", quantity: 1, unit: "pièce" },
        { name: "Huile d'olive", quantity: 50, unit: "ml" },
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

  // Seed musculation data
  await seedMusculationData();
}

async function seedMusculationData() {
  // Check if equipment already exists
  const { rows: equipmentCheck } = await query("SELECT COUNT(*) as count FROM equipment");
  if (parseInt(equipmentCheck[0].count) > 0) return;

  // Seed equipment
  const equipment = [
    { name: "Aucun (poids du corps)", icon: "body" },
    { name: "Haltères", icon: "dumbbell" },
    { name: "Barre", icon: "barbell" },
    { name: "Banc", icon: "bench" },
    { name: "Barre de traction", icon: "pullup-bar" },
    { name: "Câbles", icon: "cable" },
    { name: "Machine guidée", icon: "machine" },
    { name: "Kettlebell", icon: "kettlebell" },
    { name: "Élastiques", icon: "band" },
    { name: "Swiss Ball", icon: "ball" },
    { name: "TRX", icon: "trx" },
    { name: "Rack à squat", icon: "rack" },
  ];

  for (const eq of equipment) {
    await query(
      `INSERT INTO equipment (name, icon) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [eq.name, eq.icon]
    );
  }

  // Helper to get equipment ID
  async function getEquipmentId(name: string): Promise<number | null> {
    const { rows } = await query("SELECT id FROM equipment WHERE name = $1", [name]);
    return rows[0]?.id ?? null;
  }

  // Seed exercises - comprehensive list grouped by muscle
  const exercises = [
    // PECTORAUX
    {
      name: "Développé couché",
      description: "Exercice fondamental pour les pectoraux",
      muscle_group: "Pectoraux",
      secondary_muscles: ["Épaules", "Triceps"],
      difficulty: "intermediate",
      instructions: "1. Allongez-vous sur le banc, pieds au sol\n2. Saisissez la barre légèrement plus large que les épaules\n3. Descendez la barre vers la poitrine\n4. Poussez vers le haut en contractant les pectoraux\n5. Gardez les coudes à 45° du corps",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre", "Banc"]
    },
    {
      name: "Développé couché haltères",
      description: "Variante avec haltères pour plus d'amplitude",
      muscle_group: "Pectoraux",
      secondary_muscles: ["Épaules", "Triceps"],
      difficulty: "intermediate",
      instructions: "1. Allongez-vous sur le banc avec un haltère dans chaque main\n2. Bras tendus au-dessus de la poitrine\n3. Descendez les haltères en contrôlant\n4. Remontez en contractant les pectoraux",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Haltères", "Banc"]
    },
    {
      name: "Développé incliné",
      description: "Cible le haut des pectoraux",
      muscle_group: "Pectoraux",
      secondary_muscles: ["Épaules", "Triceps"],
      difficulty: "intermediate",
      instructions: "1. Réglez le banc à 30-45°\n2. Même mouvement que le développé couché\n3. Descendez la barre vers le haut de la poitrine",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre", "Banc"]
    },
    {
      name: "Écarté couché haltères",
      description: "Isolation des pectoraux",
      muscle_group: "Pectoraux",
      secondary_muscles: [],
      difficulty: "intermediate",
      instructions: "1. Allongez-vous avec les haltères au-dessus de la poitrine\n2. Bras légèrement fléchis\n3. Ouvrez les bras en arc de cercle\n4. Remontez en serrant les pectoraux",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Haltères", "Banc"]
    },
    {
      name: "Pompes",
      description: "Exercice de base au poids du corps",
      muscle_group: "Pectoraux",
      secondary_muscles: ["Épaules", "Triceps", "Abdominaux"],
      difficulty: "beginner",
      instructions: "1. Position de planche, mains largeur épaules\n2. Descendez le corps en gardant le dos droit\n3. Remontez en poussant\n4. Gardez les abdos gainés",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },
    {
      name: "Dips (pectoraux)",
      description: "Mouvement polyarticulaire pour le bas des pectoraux",
      muscle_group: "Pectoraux",
      secondary_muscles: ["Triceps", "Épaules"],
      difficulty: "intermediate",
      instructions: "1. Sur les barres parallèles\n2. Penchez le buste en avant\n3. Descendez jusqu'à 90° aux coudes\n4. Remontez en contractant les pectoraux",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre de traction"]
    },
    {
      name: "Pec deck (butterfly)",
      description: "Isolation des pectoraux à la machine",
      muscle_group: "Pectoraux",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Asseyez-vous, dos contre le dossier\n2. Saisissez les poignées\n3. Ramenez les bras devant vous\n4. Contrôlez le retour",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Machine guidée"]
    },
    {
      name: "Pull-over",
      description: "Étirement et travail des pectoraux et dorsaux",
      muscle_group: "Pectoraux",
      secondary_muscles: ["Dorsaux", "Triceps"],
      difficulty: "intermediate",
      instructions: "1. Allongez-vous perpendiculairement au banc\n2. Tenez un haltère au-dessus de la poitrine\n3. Descendez l'haltère derrière la tête\n4. Remontez en arc de cercle",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Haltères", "Banc"]
    },

    // DOS
    {
      name: "Tractions",
      description: "Exercice roi pour le dos",
      muscle_group: "Dos",
      secondary_muscles: ["Biceps", "Épaules"],
      difficulty: "intermediate",
      instructions: "1. Saisissez la barre en pronation\n2. Tirez-vous jusqu'à ce que le menton passe la barre\n3. Descendez en contrôlant\n4. Gardez les épaules basses",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre de traction"]
    },
    {
      name: "Tractions supination",
      description: "Tractions avec paumes vers soi, plus de biceps",
      muscle_group: "Dos",
      secondary_muscles: ["Biceps"],
      difficulty: "intermediate",
      instructions: "1. Saisissez la barre paumes vers vous\n2. Tirez-vous jusqu'au menton\n3. Contractez le dos et les biceps",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre de traction"]
    },
    {
      name: "Rowing barre",
      description: "Mouvement de base pour l'épaisseur du dos",
      muscle_group: "Dos",
      secondary_muscles: ["Biceps", "Épaules"],
      difficulty: "intermediate",
      instructions: "1. Penchez-vous à 45°, dos plat\n2. Saisissez la barre\n3. Tirez vers le nombril\n4. Serrez les omoplates en haut",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre"]
    },
    {
      name: "Rowing haltère",
      description: "Travail unilatéral du dos",
      muscle_group: "Dos",
      secondary_muscles: ["Biceps"],
      difficulty: "beginner",
      instructions: "1. Un genou et une main sur le banc\n2. L'autre main tient l'haltère\n3. Tirez l'haltère vers la hanche\n4. Serrez l'omoplate en haut",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Haltères", "Banc"]
    },
    {
      name: "Tirage vertical",
      description: "Alternative aux tractions à la machine",
      muscle_group: "Dos",
      secondary_muscles: ["Biceps"],
      difficulty: "beginner",
      instructions: "1. Asseyez-vous face à la machine\n2. Saisissez la barre large\n3. Tirez vers la poitrine\n4. Contrôlez la remontée",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Câbles"]
    },
    {
      name: "Tirage horizontal",
      description: "Rowing assis à la poulie",
      muscle_group: "Dos",
      secondary_muscles: ["Biceps"],
      difficulty: "beginner",
      instructions: "1. Asseyez-vous, pieds sur les supports\n2. Saisissez la poignée\n3. Tirez vers l'abdomen\n4. Gardez le dos droit",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Câbles"]
    },
    {
      name: "Soulevé de terre",
      description: "Mouvement fondamental, travaille tout le corps",
      muscle_group: "Dos",
      secondary_muscles: ["Jambes", "Fessiers", "Abdominaux"],
      difficulty: "advanced",
      instructions: "1. Pieds sous la barre, largeur hanches\n2. Saisissez la barre\n3. Dos plat, poussez avec les jambes\n4. Verrouillez les hanches en haut\n5. Reposez en contrôlant",
      rest_light: 90, rest_moderate: 120, rest_heavy: 180,
      equipment: ["Barre"]
    },
    {
      name: "Good morning",
      description: "Renforcement des lombaires et ischio-jambiers",
      muscle_group: "Dos",
      secondary_muscles: ["Ischio-jambiers", "Fessiers"],
      difficulty: "intermediate",
      instructions: "1. Barre sur les épaules\n2. Pieds largeur épaules\n3. Penchez-vous en avant, jambes légèrement fléchies\n4. Remontez en contractant les lombaires",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre", "Rack à squat"]
    },

    // ÉPAULES
    {
      name: "Développé militaire",
      description: "Exercice de base pour les épaules",
      muscle_group: "Épaules",
      secondary_muscles: ["Triceps"],
      difficulty: "intermediate",
      instructions: "1. Barre sur les clavicules\n2. Pieds largeur épaules\n3. Poussez la barre au-dessus de la tête\n4. Descendez jusqu'aux clavicules",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre"]
    },
    {
      name: "Développé haltères assis",
      description: "Développé épaules avec haltères",
      muscle_group: "Épaules",
      secondary_muscles: ["Triceps"],
      difficulty: "intermediate",
      instructions: "1. Assis sur un banc à 90°\n2. Haltères au niveau des oreilles\n3. Poussez vers le haut\n4. Descendez en contrôlant",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Haltères", "Banc"]
    },
    {
      name: "Élévations latérales",
      description: "Isolation du deltoïde latéral",
      muscle_group: "Épaules",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Debout, haltères le long du corps\n2. Levez les bras sur les côtés\n3. Montez jusqu'à parallèle au sol\n4. Descendez en contrôlant",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Haltères"]
    },
    {
      name: "Élévations frontales",
      description: "Isolation du deltoïde antérieur",
      muscle_group: "Épaules",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Debout, haltères devant les cuisses\n2. Levez un bras devant vous\n3. Montez jusqu'à parallèle au sol\n4. Alternez les bras",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Haltères"]
    },
    {
      name: "Oiseau (élévations postérieures)",
      description: "Isolation du deltoïde postérieur",
      muscle_group: "Épaules",
      secondary_muscles: ["Dos"],
      difficulty: "beginner",
      instructions: "1. Penché en avant à 90°\n2. Haltères sous la poitrine\n3. Levez les bras sur les côtés\n4. Serrez les omoplates",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Haltères"]
    },
    {
      name: "Face pull",
      description: "Travail des deltoïdes postérieurs et rotateurs",
      muscle_group: "Épaules",
      secondary_muscles: ["Dos"],
      difficulty: "beginner",
      instructions: "1. Poulie haute avec corde\n2. Tirez vers le visage\n3. Écartez les mains en fin de mouvement\n4. Contractez l'arrière des épaules",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Câbles"]
    },
    {
      name: "Shrugs",
      description: "Développement des trapèzes",
      muscle_group: "Épaules",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Haltères ou barre le long du corps\n2. Haussez les épaules vers les oreilles\n3. Maintenez 1-2 secondes\n4. Descendez lentement",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Haltères"]
    },

    // BICEPS
    {
      name: "Curl barre",
      description: "Exercice de base pour les biceps",
      muscle_group: "Biceps",
      secondary_muscles: ["Avant-bras"],
      difficulty: "beginner",
      instructions: "1. Debout, barre en main\n2. Coudes collés au corps\n3. Fléchissez les bras\n4. Contractez les biceps en haut\n5. Descendez en contrôlant",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Barre"]
    },
    {
      name: "Curl haltères",
      description: "Curl classique avec haltères",
      muscle_group: "Biceps",
      secondary_muscles: ["Avant-bras"],
      difficulty: "beginner",
      instructions: "1. Debout, haltères le long du corps\n2. Fléchissez un bras en supination\n3. Alternez ou faites les deux ensemble\n4. Gardez les coudes fixes",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Haltères"]
    },
    {
      name: "Curl marteau",
      description: "Travaille le brachial et l'avant-bras",
      muscle_group: "Biceps",
      secondary_muscles: ["Avant-bras"],
      difficulty: "beginner",
      instructions: "1. Haltères en prise neutre (pouces vers le haut)\n2. Fléchissez les bras\n3. Gardez la prise neutre tout le mouvement\n4. Contractez en haut",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Haltères"]
    },
    {
      name: "Curl concentré",
      description: "Isolation maximale du biceps",
      muscle_group: "Biceps",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Assis, coude sur la cuisse\n2. Haltère à bout de bras\n3. Fléchissez en contractant fort\n4. Descendez lentement",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Haltères"]
    },
    {
      name: "Curl pupitre",
      description: "Isole les biceps en éliminant la triche",
      muscle_group: "Biceps",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Bras sur le pupitre incliné\n2. Fléchissez les bras\n3. Ne décollez pas les bras du pupitre\n4. Contrôlez la descente",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Barre", "Banc"]
    },
    {
      name: "Curl poulie basse",
      description: "Curl à la poulie pour tension constante",
      muscle_group: "Biceps",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Face à la poulie basse\n2. Saisissez la barre ou les poignées\n3. Fléchissez les bras\n4. Profitez de la tension constante",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Câbles"]
    },

    // TRICEPS
    {
      name: "Dips (triceps)",
      description: "Exercice polyarticulaire pour les triceps",
      muscle_group: "Triceps",
      secondary_muscles: ["Pectoraux", "Épaules"],
      difficulty: "intermediate",
      instructions: "1. Sur les barres parallèles, buste droit\n2. Descendez jusqu'à 90° aux coudes\n3. Remontez en poussant\n4. Gardez le corps vertical",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre de traction"]
    },
    {
      name: "Extensions triceps poulie haute",
      description: "Isolation des triceps à la poulie",
      muscle_group: "Triceps",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Face à la poulie haute\n2. Coudes au corps\n3. Poussez vers le bas\n4. Contractez les triceps en bas",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Câbles"]
    },
    {
      name: "Extension nuque haltère",
      description: "Étire et travaille les triceps en profondeur",
      muscle_group: "Triceps",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Assis ou debout, haltère derrière la nuque\n2. Coudes pointés vers le plafond\n3. Tendez les bras vers le haut\n4. Descendez en contrôlant",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Haltères"]
    },
    {
      name: "Barre au front (skull crusher)",
      description: "Exercice d'isolation très efficace",
      muscle_group: "Triceps",
      secondary_muscles: [],
      difficulty: "intermediate",
      instructions: "1. Allongé sur un banc, barre au-dessus\n2. Descendez la barre vers le front\n3. Gardez les coudes fixes\n4. Remontez en tendant les bras",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Barre", "Banc"]
    },
    {
      name: "Kickback triceps",
      description: "Isolation en fin de mouvement",
      muscle_group: "Triceps",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Penché en avant, coude au corps\n2. Tendez le bras vers l'arrière\n3. Contractez le triceps\n4. Revenez lentement",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Haltères"]
    },
    {
      name: "Pompes triceps (mains serrées)",
      description: "Pompes avec focus triceps",
      muscle_group: "Triceps",
      secondary_muscles: ["Pectoraux", "Épaules"],
      difficulty: "intermediate",
      instructions: "1. Position de pompes, mains rapprochées\n2. Formez un triangle avec les mains\n3. Descendez en gardant les coudes près du corps\n4. Poussez vers le haut",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },

    // JAMBES - QUADRICEPS
    {
      name: "Squat",
      description: "Le roi des exercices pour les jambes",
      muscle_group: "Quadriceps",
      secondary_muscles: ["Fessiers", "Ischio-jambiers", "Abdominaux"],
      difficulty: "intermediate",
      instructions: "1. Barre sur les trapèzes\n2. Pieds largeur épaules, pointes légèrement vers l'extérieur\n3. Descendez jusqu'à ce que les cuisses soient parallèles\n4. Poussez en gardant le dos droit",
      rest_light: 90, rest_moderate: 120, rest_heavy: 180,
      equipment: ["Barre", "Rack à squat"]
    },
    {
      name: "Squat goblet",
      description: "Squat avec haltère ou kettlebell",
      muscle_group: "Quadriceps",
      secondary_muscles: ["Fessiers", "Abdominaux"],
      difficulty: "beginner",
      instructions: "1. Tenez un haltère contre la poitrine\n2. Pieds largeur épaules\n3. Descendez comme pour vous asseoir\n4. Remontez en poussant",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Haltères"]
    },
    {
      name: "Presse à cuisses",
      description: "Développe les quadriceps en sécurité",
      muscle_group: "Quadriceps",
      secondary_muscles: ["Fessiers"],
      difficulty: "beginner",
      instructions: "1. Asseyez-vous sur la machine\n2. Pieds à plat sur la plateforme\n3. Poussez jusqu'à extension (sans verrouiller)\n4. Descendez en contrôlant",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Machine guidée"]
    },
    {
      name: "Leg extension",
      description: "Isolation des quadriceps",
      muscle_group: "Quadriceps",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Assis sur la machine\n2. Coussin sur les chevilles\n3. Tendez les jambes\n4. Contractez les quadriceps\n5. Descendez lentement",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Machine guidée"]
    },
    {
      name: "Fentes",
      description: "Travail unilatéral des jambes",
      muscle_group: "Quadriceps",
      secondary_muscles: ["Fessiers", "Ischio-jambiers"],
      difficulty: "beginner",
      instructions: "1. Debout, faites un grand pas en avant\n2. Descendez le genou arrière vers le sol\n3. Gardez le torse droit\n4. Remontez et alternez",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Aucun (poids du corps)"]
    },
    {
      name: "Fentes haltères",
      description: "Fentes avec charge additionnelle",
      muscle_group: "Quadriceps",
      secondary_muscles: ["Fessiers", "Ischio-jambiers"],
      difficulty: "intermediate",
      instructions: "1. Haltères dans chaque main\n2. Faites un grand pas en avant\n3. Descendez le genou arrière\n4. Remontez et alternez",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Haltères"]
    },
    {
      name: "Squat bulgare",
      description: "Fente avec pied arrière surélevé",
      muscle_group: "Quadriceps",
      secondary_muscles: ["Fessiers", "Ischio-jambiers"],
      difficulty: "intermediate",
      instructions: "1. Pied arrière sur un banc\n2. Pied avant à environ 60cm\n3. Descendez le genou arrière\n4. Remontez en poussant sur la jambe avant",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Haltères", "Banc"]
    },

    // JAMBES - ISCHIO-JAMBIERS
    {
      name: "Leg curl couché",
      description: "Isolation des ischio-jambiers",
      muscle_group: "Ischio-jambiers",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Allongé sur la machine\n2. Coussin sur les chevilles\n3. Fléchissez les jambes vers les fessiers\n4. Descendez en contrôlant",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Machine guidée"]
    },
    {
      name: "Leg curl assis",
      description: "Variante assise du leg curl",
      muscle_group: "Ischio-jambiers",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Assis sur la machine\n2. Jambes sur le coussin\n3. Poussez vers le bas\n4. Contrôlez la remontée",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Machine guidée"]
    },
    {
      name: "Soulevé de terre roumain",
      description: "Excellent pour les ischio-jambiers et fessiers",
      muscle_group: "Ischio-jambiers",
      secondary_muscles: ["Fessiers", "Dos"],
      difficulty: "intermediate",
      instructions: "1. Barre en main, jambes légèrement fléchies\n2. Penchez-vous en poussant les fesses en arrière\n3. Gardez le dos plat\n4. Remontez en contractant les fessiers",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre"]
    },
    {
      name: "Hip thrust",
      description: "Exercice phare pour les fessiers",
      muscle_group: "Fessiers",
      secondary_muscles: ["Ischio-jambiers"],
      difficulty: "intermediate",
      instructions: "1. Dos contre un banc, épaules sur le bord\n2. Barre sur les hanches\n3. Poussez les hanches vers le plafond\n4. Serrez les fessiers en haut",
      rest_light: 60, rest_moderate: 90, rest_heavy: 120,
      equipment: ["Barre", "Banc"]
    },
    {
      name: "Glute bridge",
      description: "Version au sol du hip thrust",
      muscle_group: "Fessiers",
      secondary_muscles: ["Ischio-jambiers"],
      difficulty: "beginner",
      instructions: "1. Allongé au sol, pieds à plat\n2. Poussez les hanches vers le haut\n3. Serrez les fessiers en haut\n4. Descendez en contrôlant",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },

    // MOLLETS
    {
      name: "Mollets debout",
      description: "Exercice de base pour les mollets",
      muscle_group: "Mollets",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Sur une marche, talons dans le vide\n2. Montez sur la pointe des pieds\n3. Contractez les mollets en haut\n4. Descendez en étirant",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Machine guidée"]
    },
    {
      name: "Mollets assis",
      description: "Cible le soléaire",
      muscle_group: "Mollets",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Assis sur la machine\n2. Genoux sous les coussins\n3. Montez sur la pointe des pieds\n4. Descendez en étirant",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Machine guidée"]
    },

    // ABDOMINAUX
    {
      name: "Crunch",
      description: "Exercice de base pour les abdominaux",
      muscle_group: "Abdominaux",
      secondary_muscles: [],
      difficulty: "beginner",
      instructions: "1. Allongé, genoux fléchis\n2. Mains derrière la tête\n3. Soulevez les épaules du sol\n4. Contractez les abdos",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },
    {
      name: "Relevé de jambes",
      description: "Travaille le bas des abdominaux",
      muscle_group: "Abdominaux",
      secondary_muscles: [],
      difficulty: "intermediate",
      instructions: "1. Suspendu à une barre ou allongé\n2. Jambes tendues ou fléchies\n3. Montez les jambes vers le plafond\n4. Descendez en contrôlant",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Barre de traction"]
    },
    {
      name: "Planche (gainage)",
      description: "Renforcement global du core",
      muscle_group: "Abdominaux",
      secondary_muscles: ["Dos", "Épaules"],
      difficulty: "beginner",
      instructions: "1. Sur les coudes et les pointes de pieds\n2. Corps aligné comme une planche\n3. Serrez les abdos\n4. Maintenez la position",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },
    {
      name: "Planche latérale",
      description: "Travaille les obliques",
      muscle_group: "Abdominaux",
      secondary_muscles: ["Obliques"],
      difficulty: "intermediate",
      instructions: "1. Sur le côté, appui sur le coude\n2. Corps aligné\n3. Hanches décollées du sol\n4. Maintenez la position",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },
    {
      name: "Russian twist",
      description: "Rotation pour les obliques",
      muscle_group: "Abdominaux",
      secondary_muscles: ["Obliques"],
      difficulty: "beginner",
      instructions: "1. Assis, pieds décollés du sol\n2. Torse incliné en arrière\n3. Tournez le buste à gauche et à droite\n4. Touchez le sol de chaque côté",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },
    {
      name: "Crunch à la poulie haute",
      description: "Crunch avec résistance pour progression",
      muscle_group: "Abdominaux",
      secondary_muscles: [],
      difficulty: "intermediate",
      instructions: "1. À genoux face à la poulie haute\n2. Tenez la corde derrière la nuque\n3. Enroulez le buste vers les genoux\n4. Contractez les abdos",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Câbles"]
    },
    {
      name: "Mountain climbers",
      description: "Exercice cardio et abdos",
      muscle_group: "Abdominaux",
      secondary_muscles: ["Épaules", "Quadriceps"],
      difficulty: "beginner",
      instructions: "1. Position de planche sur les mains\n2. Ramenez un genou vers la poitrine\n3. Alternez rapidement\n4. Gardez le rythme",
      rest_light: 30, rest_moderate: 45, rest_heavy: 60,
      equipment: ["Aucun (poids du corps)"]
    },
    {
      name: "Ab wheel",
      description: "Exercice avancé pour tout le core",
      muscle_group: "Abdominaux",
      secondary_muscles: ["Dos", "Épaules"],
      difficulty: "advanced",
      instructions: "1. À genoux, mains sur la roue\n2. Roulez vers l'avant\n3. Gardez le dos plat\n4. Revenez en contractant les abdos",
      rest_light: 45, rest_moderate: 60, rest_heavy: 90,
      equipment: ["Aucun (poids du corps)"]
    },
  ];

  for (const ex of exercises) {
    const { rows: exRows } = await query(
      `INSERT INTO exercises (name, description, muscle_group, secondary_muscles, difficulty, instructions, rest_time_light, rest_time_moderate, rest_time_heavy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [ex.name, ex.description, ex.muscle_group, ex.secondary_muscles, ex.difficulty, ex.instructions, ex.rest_light, ex.rest_moderate, ex.rest_heavy]
    );
    const exerciseId = exRows[0].id;

    // Link equipment
    for (const eqName of ex.equipment) {
      const eqId = await getEquipmentId(eqName);
      if (eqId) {
        await query(
          `INSERT INTO exercise_equipment (exercise_id, equipment_id, is_required) VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
          [exerciseId, eqId]
        );
      }
    }
  }

  // Create a sample routine for the default user
  const { rows: routineRows } = await query(
    `INSERT INTO user_routines (user_id, name, description, days_of_week, is_active)
     VALUES (1, 'Push Pull Legs - Push', 'Séance pectoraux, épaules, triceps', '{1,4}', true) RETURNING id`
  );
  const routineId = routineRows[0].id;

  // Add some exercises to the routine
  const routineExercises = [
    { name: "Développé couché", sets: 4, reps: 8, weight: 60, position: 1 },
    { name: "Développé incliné", sets: 3, reps: 10, weight: 40, position: 2 },
    { name: "Écarté couché haltères", sets: 3, reps: 12, weight: 14, position: 3 },
    { name: "Développé haltères assis", sets: 4, reps: 10, weight: 20, position: 4 },
    { name: "Élévations latérales", sets: 3, reps: 15, weight: 8, position: 5 },
    { name: "Extensions triceps poulie haute", sets: 3, reps: 12, weight: 25, position: 6 },
    { name: "Dips (triceps)", sets: 3, reps: 10, weight: 0, position: 7 },
  ];

  for (const re of routineExercises) {
    const { rows: exRows } = await query("SELECT id FROM exercises WHERE name = $1", [re.name]);
    if (exRows[0]) {
      await query(
        `INSERT INTO routine_exercises (routine_id, exercise_id, position, sets, reps, weight, rest_time)
         VALUES ($1, $2, $3, $4, $5, $6, 90)`,
        [routineId, exRows[0].id, re.position, re.sets, re.reps, re.weight]
      );
    }
  }
}
