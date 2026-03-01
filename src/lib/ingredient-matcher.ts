/**
 * Intelligent Ingredient Matcher
 *
 * Matches scanned products to base ingredients used in recipes.
 * Uses keyword matching, category mapping, and fuzzy text similarity.
 */

// Mapping of keywords to base ingredient names (noms exacts de la base de données)
// IMPORTANT: Les ingrédients plus spécifiques sont définis en premier pour être matchés prioritairement
const KEYWORD_MAPPINGS: Record<string, string[]> = {
  // === VIANDES - Variantes spécifiques d'abord ===
  // Poulet - variantes spécifiques
  "Poulet (blanc)": ["filet de poulet", "blanc de poulet", "escalope de poulet", "aiguillette de poulet", "chicken breast", "chicken fillet"],
  "Cuisse de poulet": ["cuisse de poulet", "haut de cuisse", "pilon de poulet", "chicken thigh", "chicken leg", "chicken drumstick"],
  "Poulet entier": ["poulet entier", "poulet roti", "whole chicken", "roast chicken"],
  "Poulet": ["poulet", "chicken", "volaille"], // Fallback générique (si ajouté)

  // Boeuf - variantes spécifiques
  "Steak haché": ["steak hache", "viande hachee", "hache boeuf", "ground beef", "beef mince", "boeuf hache"],
  "Steak": ["steak", "entrecote", "rumsteck", "faux-filet", "bavette", "onglet", "beef steak"],
  "Boeuf": ["boeuf", "beef"], // Fallback générique

  // Porc - variantes spécifiques
  "Lardons": ["lardons", "lardon", "bacon bits", "bacon"],
  "Jambon": ["jambon", "ham"],
  "Saucisse": ["saucisse", "chipolata", "merguez", "sausage"],
  "Porc": ["porc", "pork"], // Fallback générique

  "Agneau": ["agneau", "lamb", "mouton"],
  "Dinde": ["dinde", "turkey", "escalope de dinde", "filet de dinde"],
  "Canard": ["canard", "duck", "magret", "magret de canard"],

  // === POISSONS ===
  "Saumon fumé": ["saumon fume", "smoked salmon"],
  "Saumon": ["saumon", "salmon", "pave de saumon", "filet de saumon"],
  "Thon en boîte": ["thon en boite", "thon en conserve", "canned tuna", "thon boite"],
  "Thon": ["thon", "tuna"],
  "Cabillaud": ["cabillaud", "cod", "morue", "filet de cabillaud"],
  "Crevettes": ["crevette", "shrimp", "gambas", "crevettes"],

  // === FECULENTS ===
  "Riz basmati": ["riz basmati", "basmati rice", "basmati"],
  "Riz complet": ["riz complet", "brown rice", "riz brun"],
  "Riz blanc": ["riz blanc", "white rice", "riz"],
  "Pâtes": ["pates", "pasta", "spaghetti", "tagliatelle", "penne", "fusilli", "macaroni", "nouilles", "linguine", "farfalle"],
  "Pomme de terre": ["pomme de terre", "potato", "patate", "pommes de terre"],
  "Purée": ["puree", "puree de pomme de terre", "mashed potato"],
  "Frites": ["frites", "frite", "french fries"],
  "Pain": ["pain", "bread", "baguette", "brioche"],
  "Farine": ["farine", "flour"],

  // === LEGUMES ===
  // Tomates - variantes spécifiques AVANT tomate générique
  "Sauce tomate": ["sauce tomate", "tomato sauce", "coulis de tomate", "passata", "puree de tomate"],
  "Concentré de tomate": ["concentre de tomate", "tomato paste", "double concentre", "triple concentre"],
  "Tomates pelées": ["tomates pelees", "tomate pelee", "peeled tomatoes", "tomates concassees"],
  "Tomates cerises": ["tomates cerises", "tomate cerise", "cherry tomatoes"],
  "Tomate": ["tomate", "tomato", "tomates"], // Fallback pour tomates fraîches

  "Oignon": ["oignon", "onion", "oignons"],
  "Échalote": ["echalote", "shallot", "echalotes"],
  "Ail": ["ail", "garlic", "gousse d'ail", "gousse ail"],
  "Carotte": ["carotte", "carrot", "carottes"],
  "Courgette": ["courgette", "zucchini", "courgettes"],
  "Poivron": ["poivron", "pepper", "poivrons", "poivron rouge", "poivron vert", "poivron jaune"],
  "Salade": ["salade", "laitue", "lettuce", "mesclun", "roquette", "mache"],
  "Champignon": ["champignon", "mushroom", "champignons", "champignon de paris"],
  "Haricots verts": ["haricot vert", "haricots verts", "green bean", "green beans"],
  "Brocoli": ["brocoli", "broccoli"],
  "Épinards": ["epinard", "spinach", "epinards"],
  "Aubergine": ["aubergine", "eggplant"],

  // === PRODUITS LAITIERS ===
  "Lait": ["lait", "milk"],
  "Beurre": ["beurre", "butter"],
  "Crème fraîche": ["creme fraiche", "creme epaisse", "sour cream"],
  "Crème liquide": ["creme liquide", "creme fluide", "liquid cream", "heavy cream"],
  "Fromage râpé": ["fromage rape", "grated cheese", "emmental rape", "gruyere rape"],
  "Emmental": ["emmental"],
  "Parmesan": ["parmesan", "parmigiano"],
  "Mozzarella": ["mozzarella", "mozza"],
  "Yaourt": ["yaourt", "yogourt", "yogurt"],
  "Oeuf": ["oeuf", "egg", "oeufs", "eggs"],

  // === HUILES ET CONDIMENTS ===
  "Huile d'olive": ["huile olive", "olive oil", "huile d'olive"],
  "Huile de tournesol": ["huile de tournesol", "huile tournesol", "sunflower oil"],
  "Vinaigre balsamique": ["vinaigre balsamique", "balsamic vinegar"],
  "Vinaigre": ["vinaigre", "vinegar"],
  "Moutarde": ["moutarde", "mustard"],
  "Mayonnaise": ["mayonnaise", "mayo"],
  "Ketchup": ["ketchup"],
  "Sauce soja": ["sauce soja", "soy sauce", "soja"],

  // === EPICES ===
  "Sel": ["sel", "salt"],
  "Poivre": ["poivre", "black pepper", "poivre noir"],
  "Herbes de Provence": ["herbes de provence", "herbes provence"],
  "Thym": ["thym", "thyme"],
  "Basilic": ["basilic", "basil"],
  "Persil": ["persil", "parsley"],
  "Curry": ["curry"],
  "Paprika": ["paprika"],
  "Cumin": ["cumin"],

  // === AUTRES ===
  "Sucre": ["sucre", "sugar"],
  "Miel": ["miel", "honey"],
  "Chocolat": ["chocolat", "chocolate", "cacao"],
};

// Category mappings from OpenFoodFacts categories to base ingredients
const CATEGORY_MAPPINGS: Record<string, string> = {
  "poultry": "poulet",
  "chicken": "poulet",
  "beef": "boeuf",
  "pork": "porc",
  "fish": "saumon",
  "salmon": "saumon",
  "tuna": "thon",
  "rice": "riz blanc",
  "pasta": "pates",
  "noodles": "pates",
  "potatoes": "pomme de terre",
  "tomatoes": "tomate",
  "onions": "oignon",
  "carrots": "carotte",
  "milk": "lait",
  "butter": "beurre",
  "cheese": "fromage rape",
  "yogurt": "yaourt",
  "eggs": "oeuf",
  "olive-oil": "huile d'olive",
  "bread": "pain",
  "flour": "farine",
  "sugar": "sucre",
};

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, " ")    // Remove special chars
    .replace(/\s+/g, " ")            // Normalize spaces
    .trim();
}

/**
 * Check if text contains any of the keywords and return match info
 */
function findKeywordMatch(text: string, keywords: string[]): { matched: boolean; bestKeyword: string; score: number } {
  const normalized = normalizeText(text);
  let bestMatch = { matched: false, bestKeyword: "", score: 0 };

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalized.includes(normalizedKeyword)) {
      // Score basé sur la longueur du mot-clé (plus long = plus spécifique)
      const score = normalizedKeyword.length;
      if (score > bestMatch.score) {
        bestMatch = { matched: true, bestKeyword: keyword, score };
      }
    }
  }

  return bestMatch;
}

// Groupes d'ingrédients liés - pour éviter les doublons entre variantes
// Les noms correspondent exactement à ceux de la base de données
const INGREDIENT_GROUPS: Record<string, string[]> = {
  "poulet": ["Poulet (blanc)", "Cuisse de poulet", "Poulet entier", "Poulet"],
  "boeuf": ["Steak haché", "Steak", "Boeuf"],
  "porc": ["Lardons", "Jambon", "Saucisse", "Porc"],
  "saumon": ["Saumon fumé", "Saumon"],
  "thon": ["Thon en boîte", "Thon"],
  "riz": ["Riz blanc", "Riz basmati", "Riz complet"],
  "tomate": ["Sauce tomate", "Concentré de tomate", "Tomates pelées", "Tomates cerises", "Tomate"],
  "creme": ["Crème fraîche", "Crème liquide"],
  "fromage": ["Fromage râpé", "Emmental", "Parmesan", "Mozzarella"],
  "huile": ["Huile d'olive", "Huile de tournesol"],
  "vinaigre": ["Vinaigre balsamique", "Vinaigre"],
};

/**
 * Find matching base ingredients for a scanned product
 * Priorise les matchs les plus spécifiques et évite les doublons de variantes
 */
export function findMatchingIngredients(
  productName: string,
  productCategory?: string | null,
  productBrand?: string | null
): string[] {
  const searchText = `${productName} ${productCategory || ""} ${productBrand || ""}`;

  // Collecter tous les matchs avec leur score de spécificité
  const matchesWithScores: Array<{ ingredient: string; score: number }> = [];

  // Check keyword mappings
  for (const [baseIngredient, keywords] of Object.entries(KEYWORD_MAPPINGS)) {
    const matchInfo = findKeywordMatch(searchText, keywords);
    if (matchInfo.matched) {
      matchesWithScores.push({
        ingredient: baseIngredient,
        score: matchInfo.score
      });
    }
  }

  // Trier par score décroissant (plus spécifique en premier)
  matchesWithScores.sort((a, b) => b.score - a.score);

  // Filtrer pour garder seulement le match le plus spécifique par groupe
  const finalMatches: string[] = [];
  const usedGroups = new Set<string>();

  for (const match of matchesWithScores) {
    // Trouver le groupe de cet ingrédient
    let ingredientGroup: string | null = null;
    for (const [group, members] of Object.entries(INGREDIENT_GROUPS)) {
      if (members.includes(match.ingredient)) {
        ingredientGroup = group;
        break;
      }
    }

    // Si l'ingrédient appartient à un groupe déjà utilisé, le sauter
    if (ingredientGroup && usedGroups.has(ingredientGroup)) {
      continue;
    }

    // Ajouter le match et marquer le groupe comme utilisé
    finalMatches.push(match.ingredient);
    if (ingredientGroup) {
      usedGroups.add(ingredientGroup);
    }
  }

  // Check category mappings if we have a category (seulement si pas déjà matché)
  if (productCategory) {
    const normalizedCategory = normalizeText(productCategory);
    for (const [categoryKey, baseIngredient] of Object.entries(CATEGORY_MAPPINGS)) {
      if (normalizedCategory.includes(normalizeText(categoryKey))) {
        // Vérifier que cet ingrédient ou son groupe n'est pas déjà présent
        let shouldAdd = !finalMatches.includes(baseIngredient);

        if (shouldAdd) {
          for (const [group, members] of Object.entries(INGREDIENT_GROUPS)) {
            if (members.includes(baseIngredient) && usedGroups.has(group)) {
              shouldAdd = false;
              break;
            }
          }
        }

        if (shouldAdd) {
          finalMatches.push(baseIngredient);
        }
      }
    }
  }

  return finalMatches;
}

/**
 * Calculate text similarity score (0-1)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const s1 = normalizeText(text1);
  const s2 = normalizeText(text2);

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Simple word overlap score
  const words1 = new Set(s1.split(" ").filter(w => w.length > 2));
  const words2 = new Set(s2.split(" ").filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let overlap = 0;
  Array.from(words1).forEach(word => {
    if (words2.has(word)) overlap++;
  });

  return overlap / Math.max(words1.size, words2.size);
}

/**
 * Find best matching ingredient from database by name similarity
 */
export function findBestMatch(
  productName: string,
  ingredients: Array<{ id: number; name: string; category?: string }>
): { id: number; name: string; score: number } | null {
  let bestMatch: { id: number; name: string; score: number } | null = null;

  for (const ingredient of ingredients) {
    const score = calculateSimilarity(productName, ingredient.name);

    if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        id: ingredient.id,
        name: ingredient.name,
        score,
      };
    }
  }

  return bestMatch;
}

/**
 * Get all base ingredient names that could be matched
 */
export function getAllBaseIngredientNames(): string[] {
  return Object.keys(KEYWORD_MAPPINGS);
}
